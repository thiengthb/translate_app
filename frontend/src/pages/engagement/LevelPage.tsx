import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Coins, Star, TrendingUp, Zap } from "lucide-react";

import { rewardApi } from "@/api/features/reward.api";
import type { RootState } from "@/store/store";
import { Card, PageHeader, StatTile, sk } from "./engagement-ui";

/**
 * CẤP ĐỘ — level / EXP feature reached from the "Cấp độ" mission card. Shows
 * the current level, an EXP-to-next progress ring, coin balance, and recent
 * reward history, all from /rewards/me.
 */
export default function LevelPage() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const { data: reward } = useQuery({
    queryKey: ["rewards", "me"],
    queryFn: rewardApi.getMe,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const level = reward?.level ?? 1;
  const exp = reward?.exp ?? 0;
  const expToNext = reward?.expToNext ?? 0;
  const maxLevel = expToNext === 0;
  const total = exp + expToNext;
  const pct = maxLevel ? 100 : total > 0 ? Math.round((exp / total) * 100) : 0;

  // Progress ring geometry.
  const R = 54;
  const C = 2 * Math.PI * R;
  const history = (reward?.history ?? []).slice(0, 8);

  return (
    <div className="mx-auto max-w-[900px] p-1">
      <PageHeader
        eyebrow="Cấp độ"
        title={`Level ${level}`}
        subtitle="Tích luỹ EXP từ việc học để mở khoá cấp độ tiếp theo. Mỗi hoạt động học tập đều mang lại điểm kinh nghiệm."
        accent={sk.honeyDeep}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Card className="flex flex-col items-center justify-center">
          <div className="relative h-[140px] w-[140px]">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" stroke="#F3E7EC" strokeWidth="12" />
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={sk.honey}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C - (C * pct) / 100}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[34px] font-extrabold leading-none text-[#3A2E33]">
                {level}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#9A8E92]">
                Level
              </span>
            </div>
          </div>
          <p className="m-0 mt-4 text-center text-[14px] text-[#9A8E92]">
            {maxLevel
              ? "Bạn đã đạt cấp độ tối đa! 🌟"
              : `Còn ${expToNext} EXP để lên Level ${level + 1}`}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4 self-start">
          <StatTile
            value={
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-6 w-6" style={{ color: sk.honey }} />
                {exp}
              </span>
            }
            label="EXP hiện tại"
            color={sk.honeyDeep}
          />
          <StatTile
            value={maxLevel ? "MAX" : expToNext}
            label="EXP đến cấp tiếp theo"
            color={sk.pinkDeep}
          />
          <StatTile
            value={
              <span className="inline-flex items-center gap-1.5">
                <Coins className="h-6 w-6" style={{ color: sk.honey }} />
                {reward?.coins ?? 0}
              </span>
            }
            label="Số xu tích luỹ"
            color={sk.honeyDeep}
          />
          <StatTile value={`${pct}%`} label="Tiến độ cấp độ" color={sk.mintDeep} />
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: sk.honeyDeep }} />
          <h3 className="font-display m-0 text-[18px] font-bold text-[#3A2E33]">
            Lịch sử nhận thưởng gần đây
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Star className="h-8 w-8 text-[#D8CDD1]" />
            <p className="m-0 text-[14px] text-[#9A8E92]">
              Chưa có hoạt động nào. Hãy bắt đầu học để nhận EXP!
            </p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-[#FFF6E2]/60"
              >
                <span className="min-w-0 truncate text-[14px] text-[#3A2E33]">
                  {h.description || h.sourceType}
                </span>
                <span className="flex flex-none items-center gap-3 text-[13px] font-bold">
                  {h.expGranted > 0 && (
                    <span style={{ color: sk.honeyDeep }}>+{h.expGranted} EXP</span>
                  )}
                  {h.coinsGranted > 0 && (
                    <span className="inline-flex items-center gap-1" style={{ color: sk.pinkDeep }}>
                      +{h.coinsGranted}
                      <Coins className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
