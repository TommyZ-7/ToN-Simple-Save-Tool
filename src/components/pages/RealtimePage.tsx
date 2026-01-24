import { SectionHeader, Card } from "../common";
import { motion, AnimatePresence } from "framer-motion";
import { getTerrorInfoByRoundType } from "../../data/terrors";
import { getTerrorAbilities, formatAbilities } from "../../data/terrorInfo";

interface CurrentRoundInfo {
  is_active: boolean;
  map_name?: string | null;
  round_type?: string | null;
  killers: number[];
  is_dead: boolean;
  save_code?: string | null;
}

interface RealtimePageProps {
  currentRound: CurrentRoundInfo;
}

function TerrorCard({ killerId, roundType, index }: { killerId: number; roundType: string; index: number }) {
  const terrorInfo = getTerrorInfoByRoundType(killerId, roundType);
  const terrorColor = terrorInfo.color ? `rgb(${terrorInfo.color})` : undefined;
  const abilities = getTerrorAbilities(terrorInfo.name);
  const formattedAbilities = abilities ? formatAbilities(abilities) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-lg bg-white/5 border border-white/10 overflow-hidden"
    >
      {/* Terror Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
        style={{ borderLeftWidth: 3, borderLeftColor: terrorColor || "transparent" }}
      >
        <span className="text-base font-semibold text-white flex-1">
          {terrorInfo.name}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          #{killerId}
        </span>
      </div>

      {/* Terror Abilities - Always visible */}
      {formattedAbilities.length > 0 ? (
        <div className="px-4 py-3 space-y-2">
          {formattedAbilities.map((ability, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 text-sm"
            >
              <span className="text-blue-400 font-medium shrink-0 min-w-[70px]">
                {ability.label}
              </span>
              <span className="text-gray-300">
                {ability.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-gray-500">
          詳細情報なし
        </div>
      )}
    </motion.div>
  );
}

export function RealtimePage({ currentRound }: RealtimePageProps) {
  const isActive = currentRound.is_active;
  const roundType = currentRound.round_type || "";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="リアルタイム"
        description="現在のラウンド情報"
        action={
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-500"
                }`}
            />
            <span className="text-sm text-gray-400">
              {isActive ? "ラウンド中" : "待機中"}
            </span>
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* ラウンド情報（コンパクト） */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">マップ: </span>
                <span className="text-white font-medium">
                  {currentRound.map_name || "不明"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">タイプ: </span>
                <span className="text-white font-medium">
                  {currentRound.round_type || "不明"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">状態: </span>
                <span className={currentRound.is_dead ? "text-red-400 font-medium" : "text-green-400 font-medium"}>
                  {currentRound.is_dead ? "死亡" : "生存"}
                </span>
              </div>
            </div>

            {/* 敵情報（メインコンテンツ） */}
            {currentRound.killers.length > 0 ? (
              <div className="space-y-3">
                {currentRound.killers.map((killerId, index) => (
                  <TerrorCard
                    key={`${killerId}-${index}`}
                    killerId={killerId}
                    roundType={roundType}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <Card hover={false} className="p-6 text-center">
                <div className="text-gray-500">
                  敵がスポーンするのを待っています...
                </div>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card hover={false} className="p-8 text-center">
              <div className="text-lg font-medium text-white mb-2">
                現在ラウンド中ではありません
              </div>
              <div className="text-sm text-gray-400">
                ラウンドが開始されると、敵の情報がここに表示されます。
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
