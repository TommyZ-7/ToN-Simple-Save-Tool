import { motion } from "framer-motion";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    await appWindow.hide();
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-[#1a1a1a] border-b border-white/5 select-none"
    >
      {/* App Title */}
      <div className="flex items-center gap-2 px-4" data-tauri-drag-region>
        <span
          className="text-xs font-medium text-gray-400"
          data-tauri-drag-region
        >
          ToN Simple Save Tool
        </span>
      </div>

      {/* Window Controls */}
      <div className="flex h-full">
        <WindowButton onClick={handleMinimize} hoverBg="hover:bg-white/10">
          <Minus className="w-4 h-4" />
        </WindowButton>
        <WindowButton onClick={handleMaximize} hoverBg="hover:bg-white/10">
          <Square className="w-3 h-3" />
        </WindowButton>
        <WindowButton onClick={handleClose} hoverBg="hover:bg-red-600">
          <X className="w-4 h-4" />
        </WindowButton>
      </div>
    </div>
  );
}

interface WindowButtonProps {
  onClick: () => void;
  hoverBg: string;
  children: React.ReactNode;
}

function WindowButton({ onClick, hoverBg, children }: WindowButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{
        backgroundColor: hoverBg.includes("red")
          ? "#dc2626"
          : "rgba(255, 255, 255, 0.1)",
      }}
      className="flex items-center justify-center w-12 h-full text-gray-400 hover:text-white transition-colors"
    >
      {children}
    </motion.button>
  );
}
