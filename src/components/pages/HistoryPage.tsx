import { History, Copy, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader, Card, EmptyState } from "../common";
import { useState } from "react";

interface CodeEntry {
  code: string;
  timestamp: string;
  round_type?: string | null;
  terror_names?: string[] | null;
  round_type_english?: string | null;
}

interface HistoryPageProps {
  history: CodeEntry[];
}

export function HistoryPage({ history }: HistoryPageProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const reversedHistory = [...history].reverse();

  return (
    <div className="space-y-6">
      <SectionHeader title="コード履歴" description="最大10件まで表示します" />

      {reversedHistory.length > 0 ? (
        <Card hover={false} className="divide-y divide-white/5">
          {reversedHistory.map((entry, index) => (
            <motion.div
              key={`${entry.timestamp}-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0078d4]/20 flex items-center justify-center text-[#0078d4] text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-400">{entry.timestamp}</div>
                    {entry.round_type_english && (
                      <div className="px-2 py-0.5 rounded bg-[#0078d4]/20 text-xs text-[#0078d4]">
                        {entry.round_type_english}
                      </div>
                    )}
                    {entry.round_type && !entry.round_type_english && (
                      <div className="text-xs text-gray-500">
                        {entry.round_type} 生存
                      </div>
                    )}
                  </div>
                  {entry.terror_names && entry.terror_names.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {entry.terror_names.map((name, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 text-xs text-red-400"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleCopy(entry.code, index)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors text-sm text-gray-400 hover:text-white"
              >
                {copiedIndex === index ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">コピーしました</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>コピー</span>
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon={<History className="w-16 h-16" />}
          title="履歴がありません"
          description="セーブコードが検出されると表示されます。"
        />
      )}
    </div>
  );
}
