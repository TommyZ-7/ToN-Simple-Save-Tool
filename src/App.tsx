import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import "./App.css";
import { Sidebar, TitleBar, PageContainer } from "./components/layout";
import {
  HomePage,
  HistoryPage,
  SettingsPage,
  AboutPage,
  RealtimePage,
} from "./components/pages";
import { UpdateBanner } from "./components/common";
import { useUpdater } from "./hooks";

type CodeEntry = {
  code: string;
  timestamp: string;
  round_type?: string | null;
};

type RoundTypeStats = {
  survivals: number;
  deaths: number;
};

type RoundStats = {
  total_rounds: number;
  deaths: number;
  round_types: Record<string, RoundTypeStats>;
};

type CurrentRoundInfo = {
  is_active: boolean;
  map_name?: string | null;
  round_type?: string | null;
  killers: number[];
  is_dead: boolean;
  save_code?: string | null;
};

type AppSettings = {
  log_dir?: string | null;
  auto_switch_tab?: boolean;
};

type AppSnapshot = {
  settings: AppSettings;
  history: CodeEntry[];
  latest_code?: CodeEntry | null;
  stats: RoundStats;
  survivals: number;
  current_round: CurrentRoundInfo;
};

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [snapshot, setSnapshot] = useState<AppSnapshot>({
    settings: {},
    history: [],
    latest_code: null,
    stats: { total_rounds: 0, deaths: 0, round_types: {} },
    survivals: 0,
    current_round: {
      is_active: false,
      killers: [],
      is_dead: false,
    },
  });
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const previousPageRef = useRef<string>("home");

  // アップデート機能
  const {
    status: updateStatus,
    updateInfo,
    progress: updateProgress,
    error: updateError,
    currentVersion,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
  } = useUpdater();

  useEffect(() => {
    let unlistenState: (() => void) | undefined;
    let unlistenSettings: (() => void) | undefined;
    let unlistenRoundStarted: (() => void) | undefined;
    let unlistenRoundEnded: (() => void) | undefined;

    const init = async () => {
      await refreshState();
      setAutoStartEnabled(await isEnabled());
      unlistenState = await listen("state_updated", (event) => {
        setSnapshot(event.payload as AppSnapshot);
      });
      unlistenSettings = await listen("open_settings", () => {
        setCurrentPage("home");
      });
      // ラウンド開始イベント：リアルタイムタブへ自動切替
      unlistenRoundStarted = await listen("round_started", () => {
        setCurrentPage((prev) => {
          if (prev !== "realtime") {
            previousPageRef.current = prev;
          }
          return "realtime";
        });
      });
      // ラウンド終了イベント：元のタブへ戻る
      unlistenRoundEnded = await listen("round_ended", () => {
        setCurrentPage(previousPageRef.current);
      });
    };

    init();

    return () => {
      unlistenState?.();
      unlistenSettings?.();
      unlistenRoundStarted?.();
      unlistenRoundEnded?.();
    };
  }, []);

  const refreshState = async () => {
    const data = (await invoke("get_state")) as AppSnapshot;
    setSnapshot(data);
  };

  const handleChooseLogDir = async () => {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") {
      const data = (await invoke("set_log_dir", {
        logDir: dir,
      })) as AppSettings;
      setSnapshot((prev) => ({ ...prev, settings: data }));
    }
  };

  const handleResetLogDir = async () => {
    const data = (await invoke("set_log_dir", {
      logDir: null,
    })) as AppSettings;
    setSnapshot((prev) => ({ ...prev, settings: data }));
  };

  const toggleAutoStart = async () => {
    if (autoStartEnabled) {
      await disable();
      setAutoStartEnabled(false);
    } else {
      await enable();
      setAutoStartEnabled(true);
    }
  };

  const toggleAutoSwitchTab = async () => {
    const newValue = !snapshot.settings.auto_switch_tab;
    const data = (await invoke("set_auto_switch_tab", {
      enabled: newValue,
    })) as AppSettings;
    setSnapshot((prev) => ({ ...prev, settings: data }));
  };

  const handleGoToSettings = () => {
    setCurrentPage("settings");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            latestCode={snapshot.latest_code}
            stats={snapshot.stats}
            survivals={snapshot.survivals}
          />
        );
      case "realtime":
        return <RealtimePage currentRound={snapshot.current_round} />;
      case "history":
        return <HistoryPage history={snapshot.history} />;
      case "settings":
        return (
          <SettingsPage
            autoStartEnabled={autoStartEnabled}
            autoSwitchTabEnabled={snapshot.settings.auto_switch_tab ?? false}
            logDir={snapshot.settings.log_dir}
            onToggleAutoStart={toggleAutoStart}
            onToggleAutoSwitchTab={toggleAutoSwitchTab}
            onChooseLogDir={handleChooseLogDir}
            onResetLogDir={handleResetLogDir}
            updateStatus={updateStatus}
            updateInfo={updateInfo}
            updateProgress={updateProgress}
            updateError={updateError}
            currentVersion={currentVersion}
            onCheckForUpdates={checkForUpdates}
            onDownloadAndInstall={downloadAndInstall}
          />
        );
      case "about":
        return <AboutPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
        <PageContainer currentPage={currentPage}>{renderPage()}</PageContainer>
      </div>

      {/* アップデート通知バナー */}
      <UpdateBanner
        isVisible={updateStatus === "available" && currentPage !== "settings"}
        updateInfo={updateInfo}
        onUpdate={handleGoToSettings}
        onDismiss={dismissUpdate}
      />
    </div>
  );
}

export default App;
