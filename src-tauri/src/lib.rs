use arboard::Clipboard;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    fs::{self, File},
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

const WORLD_ID: &str = "wrld_a61cdabe-1218-4287-9ffc-2a4d1414e5bd";
const MAX_HISTORY: usize = 10;

/// デフォルトのVRChatログディレクトリを取得
fn get_default_log_dir() -> Option<PathBuf> {
    // %LOCALAPPDATA%Low\VRChat\VRChat
    env::var("LOCALAPPDATA").ok().map(|local_app_data| {
        PathBuf::from(local_app_data)
            .parent()
            .unwrap_or(Path::new(""))
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat")
    })
}

/// 有効なログディレクトリを取得（設定値またはデフォルト）
fn get_effective_log_dir(settings: &AppSettings) -> Option<PathBuf> {
    settings
        .log_dir
        .as_ref()
        .map(PathBuf::from)
        .or_else(get_default_log_dir)
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct AppSettings {
    log_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CodeEntry {
    code: String,
    timestamp: String,
    round_type: Option<String>,
}

/// ラウンドタイプ別統計
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct RoundTypeStats {
    survivals: u32,
    deaths: u32,
}

/// ラウンド統計データ
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct RoundStats {
    total_rounds: u32,
    survivals: u32,
    deaths: u32,
    round_types: HashMap<String, RoundTypeStats>,
}

/// 内部データファイル（コード履歴と統計を永続化）
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct AppData {
    history: Vec<CodeEntry>,
    stats: RoundStats,
}

#[derive(Debug, Clone, Serialize)]
struct AppSnapshot {
    settings: AppSettings,
    history: Vec<CodeEntry>,
    latest_code: Option<CodeEntry>,
    stats: RoundStats,
    survivals: u32,
}

/// ランタイム状態（メモリ上のみ）
#[derive(Debug, Default)]
struct AppState {
    settings: AppSettings,
    data: AppData,
    current_round_type: Option<String>,
    last_log_path: Option<PathBuf>,
    last_offset: u64,
    last_copied_code: Option<String>,
}

type SharedState = Arc<Mutex<AppState>>;

// ============ ファイルパス取得 ============

fn settings_path(app_handle: &AppHandle) -> Option<PathBuf> {
    app_handle
        .path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("settings.json"))
}

fn data_path(app_handle: &AppHandle) -> Option<PathBuf> {
    app_handle
        .path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("data.json"))
}

// ============ 設定ファイル読み書き ============

fn load_settings(app_handle: &AppHandle) -> Option<AppSettings> {
    let path = settings_path(app_handle)?;
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn persist_settings(app_handle: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app_handle).ok_or("settings path not found")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let payload = serde_json::to_string_pretty(settings).map_err(|err| err.to_string())?;
    fs::write(path, payload).map_err(|err| err.to_string())?;
    Ok(())
}

// ============ データファイル読み書き ============

fn load_data(app_handle: &AppHandle) -> Option<AppData> {
    let path = data_path(app_handle)?;
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn persist_data(app_handle: &AppHandle, data: &AppData) -> Result<(), String> {
    let path = data_path(app_handle).ok_or("data path not found")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let payload = serde_json::to_string_pretty(data).map_err(|err| err.to_string())?;
    fs::write(path, payload).map_err(|err| err.to_string())?;
    Ok(())
}

// ============ Tauri コマンド ============

#[tauri::command]
fn get_state(state: tauri::State<SharedState>) -> AppSnapshot {
    let state = state.lock().expect("state lock");
    AppSnapshot {
        settings: state.settings.clone(),
        history: state.data.history.clone(),
        latest_code: state.data.history.last().cloned(),
        stats: state.data.stats.clone(),
        survivals: state.data.stats.survivals,
    }
}

#[tauri::command]
fn set_log_dir(
    app_handle: AppHandle,
    state: tauri::State<SharedState>,
    log_dir: Option<String>,
) -> Result<AppSettings, String> {
    let updated_settings = {
        let mut state = state.lock().map_err(|_| "state lock failed")?;
        state.settings.log_dir = log_dir;
        state.settings.clone()
    };
    persist_settings(&app_handle, &updated_settings)?;
    Ok(updated_settings)
}

// ============ ログファイル処理 ============

fn find_latest_log_file(dir: &Path) -> Option<PathBuf> {
    let mut latest: Option<(PathBuf, std::time::SystemTime)> = None;
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let metadata = entry.metadata().ok()?;
        let modified = metadata.modified().ok()?;
        match &latest {
            Some((_, last_modified)) if modified <= *last_modified => {}
            _ => latest = Some((path, modified)),
        }
    }
    latest.map(|(path, _)| path)
}

/// ログ行を処理し、コードが見つかったらデータに記録
fn process_log_line(
    line: &str,
    code_re: &Regex,
    round_re: &Regex,
    death_re: &Regex,
    survival_re: &Regex,
    state: &mut AppState,
) -> bool {
    let mut changed = false;

    // ラウンド開始を検出（ラウンドタイプを記録のみ）
    if let Some(caps) = round_re.captures(line) {
        if let Some(round_type) = caps.get(1) {
            let round_type_str = round_type.as_str().trim().to_string();
            // 前のラウンドが未決着（リスポーンなど）の場合はログ出力
            if let Some(prev_round) = &state.current_round_type {
                println!("[TSAS] 前のラウンド({})が未決着のまま次のラウンドへ", prev_round);
            }
            state.current_round_type = Some(round_type_str.clone());
            println!("[TSAS] ラウンド開始: {}", round_type_str);
            // ラウンドタイプのエントリを作成（まだ存在しない場合）
            state.data.stats.round_types.entry(round_type_str).or_default();
        }
    }

    // 死亡を検出
    if death_re.is_match(line) {
        state.data.stats.deaths += 1;
        let round_type = state.current_round_type.take().unwrap_or_else(|| "Unknown".to_string());
        // ラウンドタイプ別の統計を更新
        let round_stats = state.data.stats.round_types.entry(round_type.clone()).or_default();
        round_stats.deaths += 1;
        println!("[TSAS] 死亡検出: {} (生存: {}, 死亡: {})", round_type, state.data.stats.survivals, state.data.stats.deaths);
        changed = true;
    }

    // 生存を検出
    if survival_re.is_match(line) {
        state.data.stats.survivals += 1;
        let round_type = state.current_round_type.take().unwrap_or_else(|| "Unknown".to_string());
        // ラウンドタイプ別の統計を更新
        let round_stats = state.data.stats.round_types.entry(round_type.clone()).or_default();
        round_stats.survivals += 1;
        println!("[TSAS] 生存検出: {} (生存: {}, 死亡: {})", round_type, state.data.stats.survivals, state.data.stats.deaths);
        changed = true;
    }

    // 新規コードが見つかったらデータに記録
    if let Some(caps) = code_re.captures(line) {
        if let Some(code_match) = caps.get(1) {
            let mut parts = line.split_whitespace();
            let date = parts.next().unwrap_or_default();
            let time = parts.next().unwrap_or_default();
            let timestamp = if !date.is_empty() && !time.is_empty() {
                format!("{} {}", date, time)
            } else {
                "".to_string()
            };
            
            let code = code_match.as_str().to_string();
            let round_type = state.current_round_type.clone();
            println!("[TSAS] 新規コード発見: {} (ラウンド: {:?})", code, round_type);
            
            state.data.history.push(CodeEntry {
                code,
                timestamp,
                round_type,
            });
            
            // 最大履歴数を超えたら古いものを削除
            while state.data.history.len() > MAX_HISTORY {
                state.data.history.remove(0);
            }
            changed = true;
        }
    }

    changed
}

fn maybe_copy_latest_code(line: &str, state: &mut AppState) {
    if !line.contains(WORLD_ID) {
        return;
    }
    let latest_code = state.data.history.last().map(|entry| entry.code.clone());
    if let Some(code) = latest_code {
        if state.last_copied_code.as_deref() == Some(code.as_str()) {
            return;
        }
        if let Ok(mut clipboard) = Clipboard::new() {
            let _ = clipboard.set_text(code.clone());
            println!("[TSAS] クリップボードにコピー: {}", code);
            state.last_copied_code = Some(code);
        }
    }
}

fn start_log_monitor(app_handle: AppHandle, state: SharedState) {
    std::thread::spawn(move || {
        let code_re = Regex::new(r"\[START\]([0-9_,]+)\[END\]").expect("code regex");
        let round_re = Regex::new(r"the round type is (.+)$").expect("round regex");
        let death_re = Regex::new(r"You died\.").expect("death regex");
        let survival_re = Regex::new(r"Lived in round\.").expect("survival regex");

        loop {
            let log_dir_path = {
                let state = state.lock().expect("state lock");
                get_effective_log_dir(&state.settings)
            };

            if let Some(log_dir_path) = log_dir_path {
                if let Some(latest_log) = find_latest_log_file(&log_dir_path) {
                    let mut state_guard = state.lock().expect("state lock");
                    if state_guard
                        .last_log_path
                        .as_ref()
                        .map(|path| path != &latest_log)
                        .unwrap_or(true)
                    {
                        state_guard.last_log_path = Some(latest_log.clone());
                        // 監視開始時はファイル末尾から開始（既存の内容はスキップ）
                        if let Ok(metadata) = fs::metadata(&latest_log) {
                            state_guard.last_offset = metadata.len();
                        } else {
                            state_guard.last_offset = 0;
                        }
                    }

                    if let Ok(mut file) = File::open(&latest_log) {
                        if file.seek(SeekFrom::Start(state_guard.last_offset)).is_ok() {
                            let mut buffer = String::new();
                            if file.read_to_string(&mut buffer).is_ok() {
                                let new_offset = state_guard.last_offset + buffer.len() as u64;
                                let mut changed = false;
                                for line in buffer.lines() {
                                    if process_log_line(line, &code_re, &round_re, &death_re, &survival_re, &mut state_guard) {
                                        changed = true;
                                    }
                                    maybe_copy_latest_code(line, &mut state_guard);
                                }
                                state_guard.last_offset = new_offset;
                                
                                // 変更があればデータファイルに永続化してイベント発行
                                if changed {
                                    let data_clone = state_guard.data.clone();
                                    let snapshot = AppSnapshot {
                                        settings: state_guard.settings.clone(),
                                        history: state_guard.data.history.clone(),
                                        latest_code: state_guard.data.history.last().cloned(),
                                        stats: state_guard.data.stats.clone(),
                                        survivals: state_guard.data.stats.survivals,
                                    };
                                    drop(state_guard); // ロックを解放してからファイル書き込み
                                    let _ = persist_data(&app_handle, &data_clone);
                                    let _ = app_handle.emit("state_updated", snapshot);
                                }
                            }
                        }
                    }
                }
            }
            std::thread::sleep(Duration::from_secs(1));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_state: SharedState = Arc::new(Mutex::new(AppState::default()));

    tauri::Builder::default()
        .manage(shared_state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // 設定ファイルを読み込み
            if let Some(settings) = load_settings(&app_handle) {
                if let Ok(mut state) = app.state::<SharedState>().lock() {
                    state.settings = settings;
                }
            }
            
            // データファイル（履歴）を読み込み
            if let Some(data) = load_data(&app_handle) {
                if let Ok(mut state) = app.state::<SharedState>().lock() {
                    state.data = data;
                }
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            let show_item = tauri::menu::MenuItemBuilder::new("設定")
                .id("show")
                .build(app)?;
            let quit_item = tauri::menu::MenuItemBuilder::new("終了")
                .id("quit")
                .build(app)?;
            let tray_menu = tauri::menu::Menu::with_items(app, &[&show_item, &quit_item])?;

            tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().expect("failed to get default window icon"))
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("open_settings", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            start_log_monitor(app_handle.clone(), app.state::<SharedState>().inner().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![get_state, set_log_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
