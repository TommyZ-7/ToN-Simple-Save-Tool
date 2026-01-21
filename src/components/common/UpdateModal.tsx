import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Button, Spinner } from "./FormElements";
import type {
  UpdateStatus,
  UpdateInfo,
  UpdateProgress,
} from "../../hooks/useUpdater";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  onCheckForUpdates: () => void;
  onDownloadAndInstall: () => void;
}

export function UpdateModal({
  isOpen,
  onClose,
  status,
  updateInfo,
  progress,
  error,
  onCheckForUpdates,
  onDownloadAndInstall,
}: UpdateModalProps) {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={
              status !== "downloading" && status !== "installing"
                ? onClose
                : undefined
            }
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative max-w-md w-full bg-[#2d2d2d] rounded-lg shadow-2xl border border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">アップデート</h2>
              {status !== "downloading" && status !== "installing" && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6">{renderContent()}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  function renderContent() {
    switch (status) {
      case "idle":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#0078d4]" />
            </div>
            <div>
              <p className="text-white font-medium">アップデートを確認</p>
              <p className="text-sm text-gray-400 mt-1">
                新しいバージョンが利用可能か確認します
              </p>
            </div>
            <Button
              variant="primary"
              onClick={onCheckForUpdates}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4" />
              アップデートを確認
            </Button>
          </div>
        );

      case "checking":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center">
              <Spinner size="lg" />
            </div>
            <div>
              <p className="text-white font-medium">確認中...</p>
              <p className="text-sm text-gray-400 mt-1">
                アップデートを確認しています
              </p>
            </div>
          </div>
        );

      case "up-to-date":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-white font-medium">最新バージョンです</p>
              <p className="text-sm text-gray-400 mt-1">
                現在のバージョン: v{updateInfo?.currentVersion || "不明"}
              </p>
            </div>
            <Button variant="secondary" onClick={onClose} className="w-full">
              閉じる
            </Button>
          </div>
        );

      case "available":
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 bg-[#0078d4]/10 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6 text-[#0078d4]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">
                  新しいバージョンが利用可能です
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  v{updateInfo?.currentVersion} → v{updateInfo?.version}
                </p>
              </div>
            </div>

            {updateInfo?.body && (
              <div className="bg-white/5 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-white mb-2">
                  変更内容
                </h4>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">
                  {updateInfo.body}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                後で
              </Button>
              <Button
                variant="primary"
                onClick={onDownloadAndInstall}
                className="flex-1"
              >
                <Download className="w-4 h-4" />
                アップデート
              </Button>
            </div>
          </div>
        );

      case "downloading":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-[#0078d4]/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
              </div>
              <p className="text-white font-medium">ダウンロード中...</p>
              <p className="text-sm text-gray-400 mt-1">
                {formatBytes(progress?.downloaded || 0)} /{" "}
                {formatBytes(progress?.total || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#0078d4]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress?.percent || 0}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {Math.round(progress?.percent || 0)}%
              </p>
            </div>
          </div>
        );

      case "installing":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[#0078d4]/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
            </div>
            <div>
              <p className="text-white font-medium">インストール中...</p>
              <p className="text-sm text-gray-400 mt-1">
                アプリケーションは自動的に再起動します
              </p>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-white font-medium">エラーが発生しました</p>
              <p className="text-sm text-red-400 mt-1">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                閉じる
              </Button>
              <Button
                variant="primary"
                onClick={onCheckForUpdates}
                className="flex-1"
              >
                再試行
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ========================================
// Update Notification Banner (トースト通知用)
// ========================================

interface UpdateBannerProps {
  isVisible: boolean;
  updateInfo: UpdateInfo | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({
  isVisible,
  updateInfo,
  onUpdate,
  onDismiss,
}: UpdateBannerProps) {
  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className="bg-[#2d2d2d] rounded-lg shadow-2xl border border-white/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 bg-[#0078d4]/10 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-[#0078d4]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  新しいバージョンが利用可能
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  v{updateInfo?.version} にアップデートできます
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={onDismiss}>
                    後で
                  </Button>
                  <Button size="sm" variant="primary" onClick={onUpdate}>
                    アップデート
                  </Button>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
