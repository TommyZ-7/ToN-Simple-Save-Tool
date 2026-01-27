mod terror_data;

use arboard::Clipboard;
use base64::Engine;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

use terror_data::{get_terror_data, round_type_to_english, TerrorData};

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

/// VRオーバーレイの位置
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub enum VrOverlayPosition {
    #[default]
    RightHand,
    LeftHand,
    Above,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct AppSettings {
    log_dir: Option<String>,
    auto_switch_tab: bool,
    vr_overlay_enabled: bool,
    vr_overlay_position: VrOverlayPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CodeEntry {
    code: String,
    timestamp: String,
    round_type: Option<String>,
    /// Terror names (not IDs) detected during the round
    #[serde(default)]
    terror_names: Option<Vec<String>>,
    /// Round type converted to English via round_type_to_english
    #[serde(default)]
    round_type_english: Option<String>,
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

/// リアルタイムラウンド情報
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct CurrentRoundInfo {
    is_active: bool,
    map_name: Option<String>,
    round_type: Option<String>,
    killers: Vec<u32>,
    is_dead: bool,
    save_code: Option<String>,
}

/// テラーデータ（フロントエンドにシリアライズ用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrorDataResponse {
    pub name: String,
    pub color: Option<String>,
    pub abilities: Vec<TerrorAbilityResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerrorAbilityResponse {
    pub label: String,
    pub value: String,
}

impl From<TerrorData> for TerrorDataResponse {
    fn from(data: TerrorData) -> Self {
        TerrorDataResponse {
            name: data.name,
            color: data.color,
            abilities: data
                .abilities
                .into_iter()
                .map(|a| TerrorAbilityResponse {
                    label: a.label,
                    value: a.value,
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct AppSnapshot {
    settings: AppSettings,
    history: Vec<CodeEntry>,
    latest_code: Option<CodeEntry>,
    stats: RoundStats,
    survivals: u32,
    current_round: CurrentRoundInfo,
}

/// ランタイム状態（メモリ上のみ）
#[derive(Debug, Default)]
struct AppState {
    settings: AppSettings,
    data: AppData,
    current_round_type: Option<String>,
    current_round: CurrentRoundInfo,
    last_log_path: Option<PathBuf>,
    last_offset: u64,
    last_copied_code: Option<String>,
}

/// VRオーバーレイプロセス状態
struct VrOverlayState {
    process: Option<Child>,
    stdin_writer: Option<std::process::ChildStdin>,
}

impl Default for VrOverlayState {
    fn default() -> Self {
        Self {
            process: None,
            stdin_writer: None,
        }
    }
}

type SharedState = Arc<Mutex<AppState>>;
type SharedVrState = Arc<Mutex<VrOverlayState>>;

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
        current_round: state.current_round.clone(),
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

#[tauri::command]
fn set_auto_switch_tab(
    app_handle: AppHandle,
    state: tauri::State<SharedState>,
    enabled: bool,
) -> Result<AppSettings, String> {
    let updated_settings = {
        let mut state = state.lock().map_err(|_| "state lock failed")?;
        state.settings.auto_switch_tab = enabled;
        state.settings.clone()
    };
    persist_settings(&app_handle, &updated_settings)?;
    Ok(updated_settings)
}

// ============ VR設定コマンド ============

#[tauri::command]
fn set_vr_overlay_enabled(
    app_handle: AppHandle,
    state: tauri::State<SharedState>,
    vr_state: tauri::State<SharedVrState>,
    enabled: bool,
) -> Result<AppSettings, String> {
    let (updated_settings, current_round) = {
        let mut state = state.lock().map_err(|_| "state lock failed")?;
        state.settings.vr_overlay_enabled = enabled;
        (state.settings.clone(), state.current_round.clone())
    };
    persist_settings(&app_handle, &updated_settings)?;

    // VRオーバーレイの起動/停止
    if enabled {
        start_vr_overlay(&app_handle, vr_state.inner(), &updated_settings)?;
        // 現在のラウンド情報があれば送信
        if current_round.is_active && !current_round.killers.is_empty() {
            let round_type = current_round.round_type.as_deref().unwrap_or("Classic");
            let terror_infos: Vec<VrTerrorInfo> = current_round
                .killers
                .iter()
                .map(|id| get_terror_data(*id, round_type).into())
                .collect();
            send_vr_command(
                vr_state.inner(),
                &VrCommand::UpdateTerrors {
                    terrors: terror_infos,
                    round_type: round_type.to_string(),
                },
            )?;
        }
    } else {
        stop_vr_overlay(vr_state.inner())?;
    }

    Ok(updated_settings)
}

#[tauri::command]
fn set_vr_overlay_position(
    app_handle: AppHandle,
    state: tauri::State<SharedState>,
    vr_state: tauri::State<SharedVrState>,
    position: String,
) -> Result<AppSettings, String> {
    let pos = match position.as_str() {
        "LeftHand" => VrOverlayPosition::LeftHand,
        "Above" => VrOverlayPosition::Above,
        _ => VrOverlayPosition::RightHand,
    };

    let updated_settings = {
        let mut state = state.lock().map_err(|_| "state lock failed")?;
        state.settings.vr_overlay_position = pos.clone();
        state.settings.clone()
    };
    persist_settings(&app_handle, &updated_settings)?;

    // VRオーバーレイに位置変更を通知
    if updated_settings.vr_overlay_enabled {
        send_vr_command(vr_state.inner(), &VrCommand::SetPosition { position: pos })?;
    }

    Ok(updated_settings)
}

// ============ テラーデータコマンド ============

#[tauri::command]
fn get_terror_info(id: u32, round_type: String) -> TerrorDataResponse {
    let data = get_terror_data(id, &round_type);
    data.into()
}

#[tauri::command]
fn get_terrors_info(killer_ids: Vec<u32>, round_type: String) -> Vec<TerrorDataResponse> {
    killer_ids
        .iter()
        .map(|id| get_terror_data(*id, &round_type).into())
        .collect()
}

// ============ VRオーバーレイ管理 ============

/// VRオーバーレイに送信するテラー情報
#[derive(Debug, Clone, Serialize)]
struct VrTerrorInfo {
    name: String,
    color: Option<String>,
    abilities: Vec<VrTerrorAbility>,
}

#[derive(Debug, Clone, Serialize)]
struct VrTerrorAbility {
    label: String,
    value: String,
}

impl From<TerrorData> for VrTerrorInfo {
    fn from(data: TerrorData) -> Self {
        VrTerrorInfo {
            name: data.name,
            color: data.color,
            abilities: data
                .abilities
                .into_iter()
                .map(|a| VrTerrorAbility {
                    label: a.label,
                    value: a.value,
                })
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
enum VrCommand {
    #[serde(rename = "update_terrors")]
    UpdateTerrors {
        terrors: Vec<VrTerrorInfo>,
        round_type: String,
    },
    #[serde(rename = "set_position")]
    SetPosition { position: VrOverlayPosition },
    #[serde(rename = "clear")]
    Clear,
    #[serde(rename = "quit")]
    Quit,
}

#[cfg(windows)]
fn assign_process_to_job_object(
    process_handle: windows_sys::Win32::Foundation::HANDLE,
) -> Result<(), String> {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::JobObjects::*;

    unsafe {
        // ジョブオブジェクトを作成
        let job_handle: HANDLE = CreateJobObjectW(std::ptr::null_mut(), std::ptr::null());
        if job_handle.is_null() || job_handle == INVALID_HANDLE_VALUE {
            return Err("Failed to create job object".to_string());
        }

        // ジョブオブジェクトの制限を設定（親プロセスが終了したら子プロセスも終了）
        let job_info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
            BasicLimitInformation: JOBOBJECT_BASIC_LIMIT_INFORMATION {
                LimitFlags: JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
                ..std::mem::zeroed()
            },
            ..std::mem::zeroed()
        };

        let result = SetInformationJobObject(
            job_handle,
            JobObjectExtendedLimitInformation,
            &job_info as *const _ as *const std::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );

        if result == 0 {
            CloseHandle(job_handle);
            return Err("Failed to set job object information".to_string());
        }

        // プロセスをジョブオブジェクトに割り当て
        let result = AssignProcessToJobObject(job_handle, process_handle);
        if result == 0 {
            CloseHandle(job_handle);
            return Err("Failed to assign process to job object".to_string());
        }

        // ジョブハンドルは意図的にクローズしない
        // （プログラム終了時に自動的にクリーンアップされ、その際にプロセスがkillされる）
        // CloseHandle(job_handle);

        println!("[tsst] VR overlay process assigned to job object");
    }

    Ok(())
}

fn get_vr_overlay_path(app_handle: &AppHandle) -> Option<PathBuf> {
    // ビルド時: アプリと同じディレクトリにvr-overlay.exeとして配置される
    // 開発時: target/debug/vr-overlay.exe または binaries/vr-overlay-xxx.exe

    // まずアプリの実行ファイルと同じディレクトリを確認
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let prod_path = exe_dir.join("vr-overlay.exe");
            if prod_path.exists() {
                println!("[tsst] Found VR overlay at: {:?}", prod_path);
                return Some(prod_path);
            }
        }
    }

    // バンドル/開発共通: resource_dir 直下と resource_dir/binaries を確認
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let candidates = if cfg!(target_os = "windows") {
            vec![
                resource_dir.join("vr-overlay.exe"),
                resource_dir.join("binaries").join("vr-overlay.exe"),
                resource_dir
                    .join("binaries")
                    .join("vr-overlay-x86_64-pc-windows-msvc.exe"),
            ]
        } else {
            vec![
                resource_dir.join("vr-overlay"),
                resource_dir.join("binaries").join("vr-overlay"),
            ]
        };

        for candidate in candidates {
            if candidate.exists() {
                println!("[tsst] Found VR overlay at: {:?}", candidate);
                return Some(candidate);
            } else {
                println!("[tsst] VR overlay not found at: {:?}", candidate);
            }
        }
    }

    // 念のため: BaseDirectory::Resource で解決
    if let Ok(resolved) = app_handle
        .path()
        .resolve("vr-overlay.exe", BaseDirectory::Resource)
    {
        if resolved.exists() {
            println!("[tsst] Found VR overlay at: {:?}", resolved);
            return Some(resolved);
        }
    }

    println!("[tsst] VR overlay binary not found");
    None
}

fn start_vr_overlay(
    app_handle: &AppHandle,
    vr_state: &Mutex<VrOverlayState>,
    settings: &AppSettings,
) -> Result<(), String> {
    let mut state = vr_state.lock().map_err(|_| "vr state lock failed")?;

    // 既に起動している場合は何もしない
    if state.process.is_some() {
        return Ok(());
    }

    let binary_path = get_vr_overlay_path(app_handle).ok_or("VR overlay binary not found")?;

    let position_arg = match settings.vr_overlay_position {
        VrOverlayPosition::RightHand => "right",
        VrOverlayPosition::LeftHand => "left",
        VrOverlayPosition::Above => "above",
    };

    println!(
        "[tsst] Starting VR overlay: {:?} --position {}",
        binary_path, position_arg
    );

    // sidecarと同じディレクトリをカレントディレクトリに設定（DLLを見つけるため）
    let working_dir = binary_path.parent().unwrap_or(Path::new("."));

    let mut command = Command::new(&binary_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .current_dir(working_dir)
        .arg("--position")
        .arg(position_arg)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start VR overlay: {}", e))?;

    // Windowsの場合、子プロセスをジョブオブジェクトに割り当てる
    // これにより、親プロセス（Tauriアプリ）がクラッシュやタスクキルされても
    // 子プロセス（VRオーバーレイ）が自動的に終了する
    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        let process_handle = child.as_raw_handle() as windows_sys::Win32::Foundation::HANDLE;
        if let Err(e) = assign_process_to_job_object(process_handle) {
            println!("[tsst] Warning: Failed to assign to job object: {}", e);
            // 失敗してもプロセスは起動しているので、継続する
        }
    }

    let stdin = child.stdin.take();
    if let Some(stdout) = child.stdout.take() {
        spawn_overlay_log_reader(app_handle.clone(), stdout, "stdout");
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_overlay_log_reader(app_handle.clone(), stderr, "stderr");
    }
    state.process = Some(child);
    state.stdin_writer = stdin;

    println!("[tsst] VR overlay started");
    Ok(())
}

fn spawn_overlay_log_reader(
    app_handle: AppHandle,
    stream: impl Read + Send + 'static,
    label: &'static str,
) {
    std::thread::spawn(move || {
        let log_dir = app_handle
            .path()
            .app_data_dir()
            .ok()
            .map(|dir| dir.join("logs"));

        if let Some(ref dir) = log_dir {
            let _ = fs::create_dir_all(dir);
        }

        let log_path = log_dir
            .map(|dir| dir.join("vr-overlay.log"))
            .unwrap_or_else(|| PathBuf::from("vr-overlay.log"));

        let mut file = match fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            Ok(f) => f,
            Err(_) => return,
        };

        let _ = writeln!(file, "[tsst] log start ({})", label);
        let reader = BufReader::new(stream);
        for line in reader.lines().flatten() {
            let _ = writeln!(file, "[{}] {}", label, line);
        }
        let _ = writeln!(file, "[tsst] log end ({})", label);
    });
}

fn stop_vr_overlay(vr_state: &Mutex<VrOverlayState>) -> Result<(), String> {
    let mut state = vr_state.lock().map_err(|_| "vr state lock failed")?;

    if let Some(ref mut stdin) = state.stdin_writer {
        let cmd = serde_json::to_string(&VrCommand::Quit).unwrap_or_default();
        let _ = writeln!(stdin, "{}", cmd);
        let _ = stdin.flush();
    }

    if let Some(mut child) = state.process.take() {
        // プロセスが終了するのを少し待つ
        std::thread::sleep(Duration::from_millis(100));
        let _ = child.kill();
        let _ = child.wait();
    }

    state.stdin_writer = None;
    println!("[tsst] VR overlay stopped");
    Ok(())
}

fn send_vr_command(vr_state: &Mutex<VrOverlayState>, command: &VrCommand) -> Result<(), String> {
    let mut state = vr_state.lock().map_err(|_| "vr state lock failed")?;

    if let Some(ref mut stdin) = state.stdin_writer {
        let cmd_bytes = serde_json::to_vec(command)
            .map_err(|e| format!("Failed to serialize VR command: {}", e))?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(&cmd_bytes);
        let line = format!("b64:{}", encoded);
        writeln!(stdin, "{}", line).map_err(|e| format!("Failed to write VR command: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush VR command: {}", e))?;
        println!("[tsst] Sent VR command (b64, {} bytes)", cmd_bytes.len());
    }

    Ok(())
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

/// ログ処理結果
#[derive(Debug, Clone)]
enum LogEvent {
    None,
    StateChanged,
    RoundStarted,
    RoundEnded,
}

/// 正規表現パターン
struct LogPatterns {
    code_re: Regex,
    round_start_re: Regex,
    killers_re: Regex,
    death_re: Regex,
    reborn_re: Regex,
    survival_re: Regex,
    respawn_re: Regex,
    round_end_re: Regex,
}

impl LogPatterns {
    fn new() -> Self {
        Self {
            code_re: Regex::new(r"\[START\]([0-9_,]+)\[END\]").expect("code regex"),
            round_start_re: Regex::new(
                r"This round is taking place at (.+?) and the round type is (.+)$",
            )
            .expect("round start regex"),
            // Format: "Killers have been set - X X X // Round type is Y"
            killers_re: Regex::new(
                r"Killers have been set - (\d+) (\d+) (\d+)(?: // Round type is (.+))?",
            )
            .expect("killers regex"),
            death_re: Regex::new(r"You died\.").expect("death regex"),
            reborn_re: Regex::new(r"LOL JK, REBORN!").expect("reborn regex"),
            survival_re: Regex::new(r"Lived in round\.").expect("survival regex"),
            respawn_re: Regex::new(r"Respawned\? Coward\.").expect("respawn regex"),
            round_end_re: Regex::new(r"Verified Round End").expect("round end regex"),
        }
    }
}

/// ログ行を処理し、コードが見つかったらデータに記録
fn process_log_line(line: &str, patterns: &LogPatterns, state: &mut AppState) -> LogEvent {
    let mut event = LogEvent::None;

    // ラウンド開始を検出（マップ名とラウンドタイプを抽出）
    if let Some(caps) = patterns.round_start_re.captures(line) {
        let map_name = caps.get(1).map(|m| m.as_str().trim().to_string());
        let round_type = caps.get(2).map(|m| m.as_str().trim().to_string());

        // 前のラウンドが未決着の場合はログ出力
        if state.current_round.is_active {
            println!("[tsst] 前のラウンドが未決着のまま次のラウンドへ");
        }

        // 現在のラウンド情報を設定
        state.current_round = CurrentRoundInfo {
            is_active: true,
            map_name: map_name.clone(),
            round_type: round_type.clone(),
            killers: vec![],
            is_dead: false,
            save_code: None,
        };
        state.current_round_type = round_type.clone();

        println!("[tsst] ラウンド開始: {:?} at {:?}", round_type, map_name);

        // ラウンドタイプのエントリを作成
        if let Some(ref rt) = round_type {
            state.data.stats.round_types.entry(rt.clone()).or_default();
        }

        event = LogEvent::RoundStarted;
    }

    // 敵スポーンを検出 ("Killers have been set - X X X // Round type is Y")
    if let Some(caps) = patterns.killers_re.captures(line) {
        let k1: u32 = caps
            .get(1)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let k2: u32 = caps
            .get(2)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let k3: u32 = caps
            .get(3)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);

        // ラウンドタイプが含まれている場合は更新
        if let Some(rt_match) = caps.get(4) {
            let round_type = rt_match.as_str().trim().to_string();
            if state.current_round.round_type.is_none() {
                state.current_round.round_type = Some(round_type.clone());
                state.current_round_type = Some(round_type.clone());
                println!("[tsst] ラウンドタイプ更新: {}", round_type);
            }
        }

        // 0以外の敵コードをリストに追加
        let killers: Vec<u32> = [k1, k2, k3].into_iter().filter(|&k| k != 0).collect();
        state.current_round.killers = killers.clone();

        println!("[tsst] 敵スポーン: {:?}", killers);
        event = LogEvent::StateChanged;
    }

    // 死亡を検出
    if patterns.death_re.is_match(line) {
        state.current_round.is_dead = true;
        println!("[tsst] 死亡検出");
        event = LogEvent::StateChanged;
    }

    // 復活を検出（死亡をキャンセル）
    if patterns.reborn_re.is_match(line) {
        state.current_round.is_dead = false;
        println!("[tsst] 復活検出（死亡取消）");
        event = LogEvent::StateChanged;
    }

    // 生存を検出
    if patterns.survival_re.is_match(line) {
        println!("[tsst] 生存検出");
        // 統計は round_end で更新するため、ここではフラグのみ
        event = LogEvent::StateChanged;
    }

    // リスポーンを検出（ラウンドを無効化）
    if patterns.respawn_re.is_match(line) {
        println!("[tsst] リスポーン検出（ラウンド無効化）");
        // ラウンドをリセット（統計に含めない）
        state.current_round = CurrentRoundInfo::default();
        state.current_round_type = None;
        event = LogEvent::RoundEnded;
    }

    // ラウンド終了を検出
    if patterns.round_end_re.is_match(line) {
        let round_type = state
            .current_round_type
            .take()
            .unwrap_or_else(|| "Unknown".to_string());
        let is_dead = state.current_round.is_dead;

        // 統計を更新
        if is_dead {
            state.data.stats.deaths += 1;
            let round_stats = state
                .data
                .stats
                .round_types
                .entry(round_type.clone())
                .or_default();
            round_stats.deaths += 1;
            println!(
                "[tsst] ラウンド終了（死亡）: {} (生存: {}, 死亡: {})",
                round_type, state.data.stats.survivals, state.data.stats.deaths
            );
        } else {
            state.data.stats.survivals += 1;
            let round_stats = state
                .data
                .stats
                .round_types
                .entry(round_type.clone())
                .or_default();
            round_stats.survivals += 1;
            println!(
                "[tsst] ラウンド終了（生存）: {} (生存: {}, 死亡: {})",
                round_type, state.data.stats.survivals, state.data.stats.deaths
            );
        }

        // ラウンド情報をリセット
        state.current_round = CurrentRoundInfo::default();
        event = LogEvent::RoundEnded;
    }

    // 新規コードが見つかったらデータに記録
    if let Some(caps) = patterns.code_re.captures(line) {
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
            println!(
                "[tsst] 新規コード発見: {} (ラウンド: {:?})",
                code, round_type
            );

            // ラウンド中の場合、テラー名とラウンドタイプ（英語）を取得
            let (terror_names, round_type_english) = if state.current_round.is_active {
                let rt = round_type.as_deref().unwrap_or("Classic");
                // キラーIDからテラー名を取得
                let names: Vec<String> = state
                    .current_round
                    .killers
                    .iter()
                    .map(|id| get_terror_data(*id, rt).name)
                    .collect();
                let terror_names = if names.is_empty() { None } else { Some(names) };
                // ラウンドタイプを英語に変換
                let rt_eng = round_type.as_ref().map(|rt| round_type_to_english(rt));
                (terror_names, rt_eng)
            } else {
                (None, None)
            };

            // ラウンド中の場合、セーブコードを記録
            if state.current_round.is_active {
                state.current_round.save_code = Some(code.clone());
            }

            state.data.history.push(CodeEntry {
                code,
                timestamp,
                round_type,
                terror_names,
                round_type_english,
            });

            // 最大履歴数を超えたら古いものを削除
            while state.data.history.len() > MAX_HISTORY {
                state.data.history.remove(0);
            }

            if matches!(event, LogEvent::None) {
                event = LogEvent::StateChanged;
            }
        }
    }

    event
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
            println!("[tsst] クリップボードにコピー: {}", code);
            state.last_copied_code = Some(code);
        }
    }
}

fn start_log_monitor(app_handle: AppHandle, state: SharedState, vr_state: SharedVrState) {
    std::thread::spawn(move || {
        let patterns = LogPatterns::new();

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
                                let mut should_emit_state = false;
                                let mut should_emit_round_started = false;
                                let mut should_emit_round_ended = false;
                                let mut killers_changed = false;

                                for line in buffer.lines() {
                                    let event = process_log_line(line, &patterns, &mut state_guard);
                                    match event {
                                        LogEvent::RoundStarted => {
                                            should_emit_state = true;
                                            should_emit_round_started = true;
                                        }
                                        LogEvent::RoundEnded => {
                                            should_emit_state = true;
                                            should_emit_round_ended = true;
                                        }
                                        LogEvent::StateChanged => {
                                            should_emit_state = true;
                                            // 敵がスポーンした場合をチェック
                                            if !state_guard.current_round.killers.is_empty() {
                                                killers_changed = true;
                                            }
                                        }
                                        LogEvent::None => {}
                                    }
                                    maybe_copy_latest_code(line, &mut state_guard);
                                }
                                state_guard.last_offset = new_offset;

                                // 変更があればデータファイルに永続化してイベント発行
                                if should_emit_state {
                                    let data_clone = state_guard.data.clone();
                                    let snapshot = AppSnapshot {
                                        settings: state_guard.settings.clone(),
                                        history: state_guard.data.history.clone(),
                                        latest_code: state_guard.data.history.last().cloned(),
                                        stats: state_guard.data.stats.clone(),
                                        survivals: state_guard.data.stats.survivals,
                                        current_round: state_guard.current_round.clone(),
                                    };
                                    let auto_switch = state_guard.settings.auto_switch_tab;
                                    let vr_enabled = state_guard.settings.vr_overlay_enabled;
                                    let killers = state_guard.current_round.killers.clone();
                                    let round_type = state_guard
                                        .current_round
                                        .round_type
                                        .clone()
                                        .unwrap_or_else(|| "Classic".to_string());
                                    drop(state_guard); // ロックを解放してからファイル書き込み
                                    let _ = persist_data(&app_handle, &data_clone);
                                    let _ = app_handle.emit("state_updated", &snapshot);

                                    // ラウンド開始/終了イベントを発行（自動タブ切替用）
                                    if should_emit_round_started && auto_switch {
                                        let _ = app_handle.emit("round_started", ());
                                    }
                                    if should_emit_round_ended && auto_switch {
                                        let _ = app_handle.emit("round_ended", ());
                                    }

                                    // VRオーバーレイに敵情報を送信
                                    if vr_enabled {
                                        if killers_changed && !killers.is_empty() {
                                            let terror_infos: Vec<VrTerrorInfo> = killers
                                                .iter()
                                                .map(|id| get_terror_data(*id, &round_type).into())
                                                .collect();
                                            let _ = send_vr_command(
                                                &vr_state,
                                                &VrCommand::UpdateTerrors {
                                                    terrors: terror_infos,
                                                    round_type: round_type.clone(),
                                                },
                                            );
                                        }
                                        if should_emit_round_ended {
                                            let _ = send_vr_command(&vr_state, &VrCommand::Clear);
                                        }
                                    }
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
    let shared_vr_state: SharedVrState = Arc::new(Mutex::new(VrOverlayState::default()));

    tauri::Builder::default()
        .manage(shared_state)
        .manage(shared_vr_state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
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

            // VRオーバーレイが有効な場合は起動
            {
                let should_start_vr = {
                    let state = app.state::<SharedState>();
                    state
                        .lock()
                        .ok()
                        .map(|s| (s.settings.vr_overlay_enabled, s.settings.clone()))
                };

                if let Some((true, settings)) = should_start_vr {
                    let vr_state = app.state::<SharedVrState>();
                    let _ = start_vr_overlay(&app_handle, vr_state.inner(), &settings);
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
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("failed to get default window icon"),
                )
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
                        // VRオーバーレイを停止
                        let vr_state = app.state::<SharedVrState>();
                        let _ = stop_vr_overlay(vr_state.inner());
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            start_log_monitor(
                app_handle.clone(),
                app.state::<SharedState>().inner().clone(),
                app.state::<SharedVrState>().inner().clone(),
            );
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_log_dir,
            set_auto_switch_tab,
            set_vr_overlay_enabled,
            set_vr_overlay_position,
            get_terror_info,
            get_terrors_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
