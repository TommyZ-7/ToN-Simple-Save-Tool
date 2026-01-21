import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, Card, Toggle, Button, Spinner } from "../common";
import {
  Monitor,
  FolderOpen,
  RotateCcw,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type {
  UpdateStatus,
  UpdateInfo,
  UpdateProgress,
} from "../../hooks/useUpdater";

const DEFAULT_LOG_DIR = "%LOCALAPPDATA%Low\\VRChat\\VRChat";

interface SettingsPageProps {
  autoStartEnabled: boolean;
  logDir: string | null | undefined;
  onToggleAutoStart: () => void;
  onChooseLogDir: () => void;
  onResetLogDir: () => void;
  // アップデート関連
  updateStatus: UpdateStatus;
  updateInfo: UpdateInfo | null;
  updateProgress: UpdateProgress | null;
  updateError: string | null;
  onCheckForUpdates: () => void;
  onDownloadAndInstall: () => void;
}

export function SettingsPage({
  autoStartEnabled,
  logDir,
  onToggleAutoStart,
  onChooseLogDir,
  onResetLogDir,
  updateStatus,
  updateInfo,
  updateProgress,
  updateError,
  onCheckForUpdates,
  onDownloadAndInstall,
}: SettingsPageProps) {
  const isUsingDefault = !logDir;

  return (
    <div className="space-y-6">
      <SectionHeader title="設定" description="起動とログ監視の設定" />

      <Card hover={false} className="divide-y divide-white/5">
        <SettingItem
          icon={<Monitor className="w-5 h-5" />}
          title="自動起動"
          description="Windows起動時に自動的にバックグラウンドで起動"
        >
          <Toggle checked={autoStartEnabled} onChange={onToggleAutoStart} />
        </SettingItem>

        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="text-[#0078d4]">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-white">
                ログファイルディレクトリ
              </h4>
              <p className="text-sm text-gray-500">VRChatログの保存場所</p>
              <p className="mt-2 text-xs text-gray-400 break-all">
                {isUsingDefault ? (
                  <span>
                    <span className="text-[#0078d4]">(デフォルト)</span>{" "}
                    {DEFAULT_LOG_DIR}
                  </span>
                ) : (
                  logDir
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {!isUsingDefault && (
                <Button
                  variant="secondary"
                  onClick={onResetLogDir}
                  title="デフォルトに戻す"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button variant="secondary" onClick={onChooseLogDir}>
                参照...
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* アップデートセクション */}
      <SectionHeader
        title="アップデート"
        description="アプリケーションの更新"
      />

      <Card hover={false} className="overflow-hidden">
        <UpdateSection
          status={updateStatus}
          updateInfo={updateInfo}
          progress={updateProgress}
          error={updateError}
          onCheckForUpdates={onCheckForUpdates}
          onDownloadAndInstall={onDownloadAndInstall}
        />
      </Card>
    </div>
  );
}

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingItem({ icon, title, description, children }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="text-[#0078d4]">{icon}</div>
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ========================================
// Update Section Component
// ========================================

interface UpdateSectionProps {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  onCheckForUpdates: () => void;
  onDownloadAndInstall: () => void;
}

function UpdateSection({
  status,
  updateInfo,
  progress,
  error,
  onCheckForUpdates,
  onDownloadAndInstall,
}: UpdateSectionProps) {
  const isExpanded =
    status === "available" ||
    status === "downloading" ||
    status === "installing";

  return (
    <div>
      {/* メイン行 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="text-[#0078d4]">
            <UpdateStatusIcon status={status} />
          </div>
          <div>
            <h4 className="font-medium text-white">
              <UpdateStatusTitle status={status} updateInfo={updateInfo} />
            </h4>
            <p className="text-sm text-gray-500">
              <UpdateStatusDescription
                status={status}
                updateInfo={updateInfo}
                error={error}
              />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "available" && (
            <Button variant="primary" onClick={onDownloadAndInstall}>
              <Download className="w-4 h-4" />
              アップデート
            </Button>
          )}
          {(status === "idle" ||
            status === "up-to-date" ||
            status === "error") && (
            <Button variant="secondary" onClick={onCheckForUpdates}>
              <RefreshCw className="w-4 h-4" />
              確認
            </Button>
          )}
          {status === "checking" && (
            <Button variant="secondary" disabled>
              <Spinner size="sm" />
              確認中...
            </Button>
          )}
        </div>
      </div>

      {/* 拡張コンテンツ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/5">
              {status === "available" && updateInfo && (
                <UpdateAvailableContent updateInfo={updateInfo} />
              )}
              {status === "downloading" && progress && (
                <DownloadProgressContent progress={progress} />
              )}
              {status === "installing" && <InstallingContent />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UpdateStatusIcon({ status }: { status: UpdateStatus }) {
  switch (status) {
    case "checking":
      return <Loader2 className="w-5 h-5 animate-spin" />;
    case "available":
      return <Download className="w-5 h-5" />;
    case "downloading":
    case "installing":
      return <Loader2 className="w-5 h-5 animate-spin" />;
    case "up-to-date":
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "error":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <RefreshCw className="w-5 h-5" />;
  }
}

function UpdateStatusTitle({
  status,
  updateInfo,
}: {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
}) {
  switch (status) {
    case "checking":
      return "確認中...";
    case "available":
      return `新しいバージョン v${updateInfo?.version} が利用可能`;
    case "downloading":
      return "ダウンロード中...";
    case "installing":
      return "インストール中...";
    case "up-to-date":
      return "最新バージョンです";
    case "error":
      return "エラーが発生しました";
    default:
      return "アップデートを確認";
  }
}

function UpdateStatusDescription({
  status,
  updateInfo,
  error,
}: {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  error: string | null;
}) {
  switch (status) {
    case "checking":
      return "サーバーに問い合わせています...";
    case "available":
      return `現在のバージョン: v${updateInfo?.currentVersion}`;
    case "downloading":
      return "更新ファイルをダウンロードしています";
    case "installing":
      return "アプリケーションは自動的に再起動します";
    case "up-to-date":
      return `現在のバージョン: v${updateInfo?.currentVersion || "不明"}`;
    case "error":
      return error || "不明なエラー";
    default:
      return "新しいバージョンがあるか確認できます";
  }
}

function UpdateAvailableContent({ updateInfo }: { updateInfo: UpdateInfo }) {
  if (!updateInfo.body) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <ChevronDown className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">変更内容</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 max-h-32 overflow-y-auto">
        <p className="text-sm text-gray-400 whitespace-pre-wrap">
          {updateInfo.body}
        </p>
      </div>
    </div>
  );
}

function DownloadProgressContent({ progress }: { progress: UpdateProgress }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">
          {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
        </span>
        <span className="text-gray-400">{Math.round(progress.percent)}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#0078d4]"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  );
}

function InstallingContent() {
  return (
    <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>インストールを完了しています。しばらくお待ちください...</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
