import { motion } from "framer-motion";
import { Home, History, Settings, Info, ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: "home", label: "ホーム", icon: Home },
  { id: "history", label: "コード履歴", icon: History },
  { id: "settings", label: "設定", icon: Settings },
  { id: "about", label: "このアプリについて", icon: Info },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 64 : 280 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full bg-[#202020] border-r border-white/5"
    >
      {/* Header */}
      <div className="flex items-center h-12 px-3 border-b border-white/5">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-2 text-sm font-semibold text-white"
          >
            ToN Simple Save Tool
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium truncate"
                >
                  {item.label}
                </motion.span>
              )}

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveIndicator"
                  className="absolute left-0 w-0.75 h-4 bg-[#0078d4] rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  style={{ x: 0 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-white/5"
        >
          <p className="text-xs text-gray-500 text-center">v0.1.0</p>
        </motion.div>
      )}
    </motion.aside>
  );
}
