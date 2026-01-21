import { motion } from "framer-motion";
import { Info, Heart, Save, Clipboard, Eye, Clock } from "lucide-react";
import { SectionHeader, Card } from "../common";
import type { LucideIcon } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

export function AboutPage() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion("不明"));
  }, []);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="このアプリについて"
        description="ToN Simple Save Tool の情報"
      />

      <Card hover={false} className="p-6">
        <div className="flex items-start gap-6">
          <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-[#0078d4] to-[#00b4d8] rounded-2xl flex items-center justify-center">
            <Save className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              ToN Simple Save Tool
            </h2>
            <p className="text-gray-400 mb-2">
              VRChatのゲームワールド「Terrors of Nowhere」のセーブコードを
              自動監視・管理するツールです。
            </p>
            <p className="text-sm text-gray-500 mb-4">バージョン: v{version}</p>
            <a
              href="https://vrchat.com/home/world/wrld_a61cdabe-1218-4287-9ffc-2a4d1414e5bd/info"
              target="_blank"
              rel="noreferrer"
              className="text-[#0078d4] hover:text-[#1a86d9] text-sm font-medium"
            >
              ワールドページを開く →
            </a>
          </div>
        </div>
      </Card>

      <Card hover={false} className="p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-[#0078d4]" />
          機能
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <FeatureItem
            icon={Eye}
            title="ログ監視"
            description="VRChatのログファイルをリアルタイムで監視"
          />
          <FeatureItem
            icon={Save}
            title="コード記録"
            description="セーブコードを自動で検出・保存（最大10件）"
          />
          <FeatureItem
            icon={Clipboard}
            title="自動コピー"
            description="ワールド入室時に最新コードをクリップボードに送信"
          />
          <FeatureItem
            icon={Clock}
            title="履歴管理"
            description="過去のセーブコードを履歴として表示"
          />
        </div>
      </Card>

      <Card hover={false} className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          クレジット
        </h3>

        <div className="space-y-3 text-sm text-gray-400">
          <p>Built with ❤️ using:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>
              Tauri 2 - クロスプラットフォームアプリケーションフレームワーク
            </li>
            <li>React - ユーザーインターフェースライブラリ</li>
            <li>Tailwind CSS - CSSフレームワーク</li>
            <li>Framer Motion - アニメーションライブラリ</li>
            <li>Lucide React - アイコンライブラリ</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function FeatureItem({ icon: Icon, title, description }: FeatureItemProps) {
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      className="p-4 rounded-lg bg-white/2 border border-white/5"
    >
      <div className="flex items-start gap-3">
        <Icon className="w-6 h-6 text-[#0078d4] shrink-0" />
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
