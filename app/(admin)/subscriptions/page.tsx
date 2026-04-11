"use client";
import { useState, useEffect, useCallback } from "react";

interface BossSub {
  bossId: number;
  name: string;
  phone: string;
  project: string | null;
  bossActive: boolean;
  subscription: {
    status: string;
    isActive: boolean;
    billingCycle: string;
    planCode: string;
    planName: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    lastActivityAt: string | null;
    daysSinceActivity: number | null;
    paymentCount: number;
    totalPaidYuan: string;
  } | null;
}

interface RevenueData {
  mrrYuan: string;
  totalRevenueYuan: string;
  pendingPayments: { count: number; totalYuan: string };
  planDistribution: Record<string, number>;
  funnel: { totalBosses: number; trial: number; active: number; conversionRate: number };
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: "试用中", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  active: { label: "已激活", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  past_due: { label: "欠费", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  cancelled: { label: "已取消", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  expired: { label: "已过期", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

export default function SubscriptionsPage() {
  const [bosses, setBosses] = useState<BossSub[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [bossData, revData] = await Promise.all([
        fetch(`/api/admin/subscriptions${filter ? `?status=${filter}` : ""}`).then((r) => r.json()),
        fetch("/api/admin/revenue").then((r) => r.json()),
      ]);
      if (Array.isArray(bossData)) setBosses(bossData);
      if (revData.mrrYuan !== undefined) setRevenue(revData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">订阅管理</h1>

      {/* 收入概览 */}
      {revenue && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MRR (月经常性收入)", value: `¥${revenue.mrrYuan}`, color: "var(--accent)" },
            { label: "累计收入", value: `¥${revenue.totalRevenueYuan}`, color: "var(--green)" },
            { label: "待确认付款", value: `${revenue.pendingPayments.count} 笔 ¥${revenue.pendingPayments.totalYuan}`, color: "var(--amber)" },
            { label: "付费转化率", value: `${revenue.funnel.conversionRate}%`, color: "#c084fc" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
              <div className="font-mono font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 转化漏斗 */}
      {revenue && (
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>用户漏斗</div>
          <div className="flex items-end gap-4 h-24">
            {[
              { label: "注册", count: revenue.funnel.totalBosses, color: "#60a5fa" },
              { label: "试用", count: revenue.funnel.trial, color: "#f59e0b" },
              { label: "付费", count: revenue.funnel.active, color: "#10b981" },
            ].map((item) => {
              const max = revenue.funnel.totalBosses || 1;
              const height = Math.max(8, (item.count / max) * 100);
              return (
                <div key={item.label} className="flex flex-col items-center flex-1">
                  <span className="font-mono text-sm font-bold" style={{ color: item.color }}>{item.count}</span>
                  <div
                    className="w-full rounded-t-lg mt-1 transition-all"
                    style={{ height: `${height}%`, background: `${item.color}30`, border: `1px solid ${item.color}50` }}
                  />
                  <span className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 套餐分布 */}
      {revenue && Object.keys(revenue.planDistribution).length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>套餐分布</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(revenue.planDistribution).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg)" }}>
                <span style={{ color: "var(--text)" }}>{name}</span>
                <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 状态过滤 */}
      <div className="flex gap-2">
        {["", "trial", "active", "past_due", "cancelled", "expired"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === s ? "var(--accent)" : "var(--surface)",
              color: filter === s ? "#fff" : "var(--muted)",
              border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {s === "" ? "全部" : STATUS_STYLES[s]?.label || s}
          </button>
        ))}
      </div>

      {/* 老板列表 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : bosses.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无老板数据</div>
      ) : (
        <div className="space-y-3">
          {bosses.map((b) => {
            const sub = b.subscription;
            const ss = sub ? STATUS_STYLES[sub.status] || STATUS_STYLES.trial : null;
            return (
              <div
                key={b.bossId}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                  >
                    {b.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{b.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {b.phone} · {b.project || "全部项目"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sub ? (
                    <>
                      <div className="text-right">
                        <div className="text-xs font-medium" style={{ color: ss?.color }}>
                          {sub.planName}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                          {sub.daysSinceActivity !== null ? `${sub.daysSinceActivity}天前活跃` : ""}
                          {sub.totalPaidYuan !== "0.00" ? ` · ¥${sub.totalPaidYuan}` : ""}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: ss?.color, background: ss?.bg }}>
                        {ss?.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", background: "var(--bg)" }}>
                      未订阅
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
