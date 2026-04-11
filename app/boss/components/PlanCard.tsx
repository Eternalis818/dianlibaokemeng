"use client";

interface PlanData {
  id: number;
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceYuan: string;
  yearlyPriceYuan: string | null;
  features: Record<string, boolean>;
  aiQuota: number;
  maxProjects: number;
}

const FEATURE_LABELS: Record<string, string> = {
  checkin: "打卡签到",
  reports: "报量提交",
  approval: "审批管理",
  accounting: "记账模块",
  quantities: "量价汇总",
  visaPL: "签证盈亏",
  ai: "AI 助手",
  dataAnalysis: "数据分析",
  prioritySupport: "优先支持",
  dailyPush: "日报推送",
  weeklyReport: "周报推送",
  customReports: "定制报表",
  apiIntegration: "API 对接",
};

const PLAN_COLORS: Record<string, { bg: string; border: string; accent: string; glow: string }> = {
  trial: { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.25)", accent: "#94a3b8", glow: "none" },
  experience: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", accent: "#60a5fa", glow: "none" },
  basic: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", accent: "#3b82f6", glow: "0 0 16px rgba(59,130,246,0.15)" },
  pro: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", accent: "#10b981", glow: "0 0 16px rgba(16,185,129,0.15)" },
  flagship: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)", accent: "#a855f7", glow: "0 0 24px rgba(168,85,247,0.2)" },
  lifetime: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", accent: "#f59e0b", glow: "0 0 20px rgba(245,158,11,0.15)" },
};

export default function PlanCard({
  plan,
  yearly,
  current,
  onSelect,
}: {
  plan: PlanData;
  yearly: boolean;
  current: boolean;
  onSelect: (plan: PlanData) => void;
}) {
  const colors = PLAN_COLORS[plan.code] || PLAN_COLORS.trial;
  const price = yearly && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.monthlyPrice;
  const priceYuan = (price / 100).toFixed(0);
  const isFree = price === 0;
  const featureList = Object.entries(plan.features || {})
    .filter(([, v]) => v)
    .map(([k]) => FEATURE_LABELS[k] || k);

  const isPopular = plan.code === "pro";
  const isRecommended = plan.code === "flagship";

  return (
    <div
      className="relative rounded-2xl p-4 transition-all"
      style={{
        background: colors.bg,
        border: current ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
        boxShadow: colors.glow,
      }}
    >
      {/* Badge */}
      {(isPopular || isRecommended) && (
        <div
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full"
          style={{ background: colors.accent, color: "#fff" }}
        >
          {isPopular ? "最受欢迎" : "推荐"}
        </div>
      )}

      {/* Plan name */}
      <div className="text-center mb-3 pt-1">
        <div className="text-sm font-bold" style={{ color: colors.accent }}>{plan.name}</div>
        <div className="mt-2">
          {isFree ? (
            <span className="font-mono text-2xl font-bold text-white">免费</span>
          ) : (
            <>
              <span className="font-mono text-2xl font-bold text-white">¥{priceYuan}</span>
              <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
                {plan.code === "lifetime" ? "一次性" : yearly && plan.yearlyPrice > 0 ? "/年" : "/月"}
              </span>
            </>
          )}
        </div>
        {yearly && plan.yearlyPrice > 0 && plan.monthlyPrice > 0 && (
          <div className="text-[10px] mt-0.5" style={{ color: colors.accent }}>
            省 ¥{((plan.monthlyPrice * 12 - plan.yearlyPrice) / 100).toFixed(0)}/年
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-1.5 mb-4">
        {featureList.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs" style={{ color: "var(--text)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {f}
          </div>
        ))}
        {plan.aiQuota > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            AI 额度 {plan.aiQuota}次/月
          </div>
        )}
        {plan.aiQuota === -1 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            AI 按量计费
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={() => onSelect(plan)}
        disabled={current}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
        style={{
          background: current ? "transparent" : colors.accent,
          color: current ? "var(--muted)" : "#fff",
          border: current ? "1px solid var(--border)" : "none",
          boxShadow: current ? "none" : `0 0 16px ${colors.accent}40`,
        }}
      >
        {current ? "当前套餐" : isFree ? "自动试用" : "选择套餐"}
      </button>
    </div>
  );
}
