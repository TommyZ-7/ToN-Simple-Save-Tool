import {
  Copy,
  ClipboardCheck,
  Heart,
  Skull,
  Target,
  Swords,
  RotateCcw,
} from "lucide-react";
import { SectionHeader, Card, Toggle } from "../common";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeEntry {
  code: string;
  timestamp: string;
  round_type?: string | null;
  terror_names?: string[] | null;
  round_type_english?: string | null;
}

interface RoundTypeStats {
  survivals: number;
  deaths: number;
}

interface RoundStats {
  total_rounds: number;
  deaths: number;
  round_types: Record<string, RoundTypeStats>;
}

interface HomePageProps {
  latestCode: CodeEntry | null | undefined;
  stats: RoundStats;
  survivals: number;
  instanceRoundCounts: Record<string, number>;
  showInstanceCounter: boolean;
  onToggleInstanceCounter: () => void;
}

// ラウンドタイプの表示名（キーはログから取得される日本語名）
const ROUND_TYPE_LABELS: Record<string, string> = {
  クラシック: "クラシック",
  オルタネイト: "オルタネイト",
  霧: "霧",
  パニッシュ: "パニッシュ",
  サボタージュ: "サボタージュ",
  狂気: "狂気",
  ブラッドバス: "ブラッドバス",
  ミッドナイト: "ミッドナイト",
  ミスティックムーン: "ミスティックムーン",
  ブラッドムーン: "ブラッドムーン",
  トワイライト: "トワイライト",
  ソルスティス: "ソルスティス",
  RUN: "RUN",
  "8ページ": "8ページ",
  アンバウンド: "アンバウンド",
  ゴースト: "ゴースト",
};

// 表示順序（ログから取得される日本語名で管理）
const ROUND_TYPE_ORDER = [
  "クラシック",
  "オルタネイト",
  "霧",
  "パニッシュ",
  "サボタージュ",
  "狂気",
  "ブラッドバス",
  "ミッドナイト",
  "ミスティックムーン",
  "ブラッドムーン",
  "トワイライト",
  "ソルスティス",
  "RUN",
  "8ページ",
  "アンバウンド",
  "ゴースト",
];

export function HomePage({
  latestCode,
  stats,
  survivals,
  instanceRoundCounts,
  showInstanceCounter,
  onToggleInstanceCounter,
}: HomePageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (latestCode?.code) {
      await navigator.clipboard.writeText(latestCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalRounds = survivals + stats.deaths;
  const survivalRate =
    totalRounds > 0 ? Math.round((survivals / totalRounds) * 100) : 0;

  const instanceTotal = Object.values(instanceRoundCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const activeInstanceTypes = ROUND_TYPE_ORDER.filter(
    (type) => (instanceRoundCounts[type] ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="ホーム" description="セーブコードと統計情報" />

      {/* 最新のコード */}
      <Card hover={false} className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">最新のセーブコード</div>
            {latestCode ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-400">
                    {latestCode.timestamp}
                  </div>
                  {latestCode.round_type_english && (
                    <div className="px-2 py-0.5 rounded bg-[#0078d4]/20 text-xs text-[#0078d4]">
                      {latestCode.round_type_english}
                    </div>
                  )}
                  {latestCode.round_type && !latestCode.round_type_english && (
                    <div className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-400">
                      {latestCode.round_type} 生存
                    </div>
                  )}
                </div>
                {latestCode.terror_names &&
                  latestCode.terror_names.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {latestCode.terror_names.map((name, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-red-500/20 text-xs text-red-400"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">コードがありません</div>
            )}
          </div>
          {latestCode && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0078d4] hover:bg-[#1084d8] transition-colors text-white text-sm font-medium"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  コピーしました
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  コピー
                </>
              )}
            </button>
          )}
        </div>
      </Card>

      {/* 統計サマリー */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="総ラウンド"
          value={totalRounds}
          color="#0078d4"
        />
        <StatCard
          icon={<Heart className="w-5 h-5" />}
          label="生存"
          value={survivals}
          color="#22c55e"
        />
        <StatCard
          icon={<Skull className="w-5 h-5" />}
          label="死亡"
          value={stats.deaths}
          color="#ef4444"
        />
        <StatCard
          icon={<Swords className="w-5 h-5" />}
          label="生存率"
          value={`${survivalRate}%`}
          color="#f59e0b"
        />
      </div>

      {/* インスタンス内ラウンドタイプカウンター */}
      <Card hover={false} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                インスタンス内カウンター
              </span>
            </div>
            {showInstanceCounter && instanceTotal > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#0078d4]/20 text-xs text-[#0078d4] font-medium">
                計 {instanceTotal} ラウンド
              </span>
            )}
          </div>
          <Toggle
            checked={showInstanceCounter}
            onChange={onToggleInstanceCounter}
          />
        </div>
        <AnimatePresence>
          {showInstanceCounter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {activeInstanceTypes.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {activeInstanceTypes.map((type) => (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 truncate">
                          {ROUND_TYPE_LABELS[type] || type}
                        </span>
                        <span className="text-sm font-medium text-[#0078d4]">
                          {instanceRoundCounts[type]}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  まだラウンドがありません
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ラウンドタイプ別統計 */}
      <Card hover={false} className="p-4">
        <div className="text-sm font-medium text-white mb-4">
          ラウンドタイプ別統計
        </div>
        <div className="grid grid-cols-4 gap-3">
          {ROUND_TYPE_ORDER.map((type) => (
            <RoundTypeCard
              key={type}
              type={type}
              label={ROUND_TYPE_LABELS[type] || type}
              stats={stats.round_types[type]}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <Card hover={false} className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold text-white">{value}</div>
        </div>
      </div>
    </Card>
  );
}

interface RoundTypeCardProps {
  type: string;
  label: string;
  stats?: RoundTypeStats;
}

function RoundTypeCard({ label, stats }: RoundTypeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const count = stats ? stats.survivals + stats.deaths : 0;
  const survivalsCount = stats?.survivals || 0;
  const deathsCount = stats?.deaths || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => count > 0 && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative overflow-hidden p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-default"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 truncate">{label}</span>
        <div className="relative min-w-[60px] flex justify-end">
          <AnimatePresence mode="wait" initial={false}>
            {!isHovered ? (
              <motion.span
                key="count"
                initial={{ x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 12, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className={`text-sm font-medium ${count > 0 ? "text-white" : "text-gray-600"}`}
              >
                {count}
              </motion.span>
            ) : (
              <motion.div
                key="details"
                initial={{ x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 12, opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="flex items-center gap-2"
              >
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-400">
                    {survivalsCount}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Skull className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-400">{deathsCount}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
