"use client";

import { useCallback, useEffect, useState } from "react";

type AiGrade = "excellent" | "good" | "normal" | "warning";

interface DailyValueItem {
  task: string;
  project: string;
  qty: string;
  totalValue: number;
}

interface DailyValueData {
  date: string;
  outputValue: number;
  outputDetail: DailyValueItem[];
  laborCost: number;
  materialCost: number;
  expenseCost: number;
  totalCost: number;
  workersOnsite: number;
  totalManHours: number;
  perWorkerOutput: number;
  efficiencyRatio: number;
  pnl: number;
  pnlPercent: number;
  aiSuggestion: string;
  aiGrade: AiGrade;
}

interface CostPart {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

function fmtMoney(v: number) {
  return `¥${Math.round(v).toLocaleString()}`;
}

function fmtDateValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeCostBreakdown(laborCost: number, materialCost: number, expenseCost: number): CostPart[] {
  const total = laborCost + materialCost + expenseCost;

  const parts = [
    { key: "labor", label: "工资", value: laborCost, color: "#60a5fa" },
    { key: "material", label: "杂费", value: materialCost, color: "#f59e0b" },
    { key: "expense", label: "记账", value: expenseCost, color: "#a78bfa" },
  ];

  return parts.map((p) => ({
    ...p,
    percent: total > 0 ? Math.round((p.value / total) * 100) : 0,
  }));
}

export function gradeMeta(grade: AiGrade) {
  const map: Record<AiGrade, { label: string; accent: string; bg: string; border: string }> = {
    excellent: { label: "优秀", accent: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.28)" },
    good: { label: "良好", accent: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.28)" },
    normal: { label: "正常", accent: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)" },
    warning: { label: "预警", accent: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.28)" },
  };

  return map[grade];
}

export default function DailyValueTab() {
  const [date, setDate] = useState(fmtDateValue(new Date()));
  const [data, setData] = useState<DailyValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (targetDate: string, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/boss/daily-value?date=${encodeURIComponent(targetDate)}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "加载失败");
      }
      const payload = (await res.json()) as DailyValueData;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(date);
  }, [date, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(date, true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm" style={{ color: "var(--muted)" }}>加载今日经营看板...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 px-4 py-6">
        <div className="glass rounded-2xl p-4 text-sm" style={{ color: "#f87171" }}>
          {error}
          <button onClick={onRefresh} className="ml-3 underline" style={{ color: "var(--accent)" }}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const pnlColor = data.pnl >= 0 ? "var(--green)" : "#f87171";
  const breakdown = computeCostBreakdown(data.laborCost, data.materialCost, data.expenseCost);
  const grade = gradeMeta(data.aiGrade);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">今日经营看板</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{data.date}</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "var(--accent)" }}
          >
            {refreshing ? "刷新中" : "刷新"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>今日产值</div>
          <div className="font-mono font-bold text-xl mt-1" style={{ color: "var(--accent)" }}>{fmtMoney(data.outputValue)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>今日成本</div>
          <div className="font-mono font-bold text-xl mt-1" style={{ color: "#f59e0b" }}>{fmtMoney(data.totalCost)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>盈亏</div>
          <div className="font-mono font-bold text-xl mt-1" style={{ color: pnlColor }}>
            {data.pnl >= 0 ? "+" : "-"}{fmtMoney(Math.abs(data.pnl)).slice(1)}
          </div>
          <div className="text-xs mt-1 font-mono" style={{ color: pnlColor }}>{data.pnlPercent.toFixed(1)}%</div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>成本构成分析</div>
        {breakdown.map((item) => (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text)" }}>{item.label}</span>
              <span className="font-mono" style={{ color: "var(--muted)" }}>{fmtMoney(item.value)} · {item.percent}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "rgba(148,163,184,0.16)" }}>
              <div className="h-2 rounded-full" style={{ width: `${item.percent}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>在场工人</div>
          <div className="font-mono font-bold text-lg mt-1 text-white">{data.workersOnsite} 人</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>人均产值</div>
          <div className="font-mono font-bold text-lg mt-1 text-white">{fmtMoney(data.perWorkerOutput)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs" style={{ color: "var(--muted)" }}>工效比</div>
          <div className="font-mono font-bold text-lg mt-1 text-white">¥{data.efficiencyRatio.toFixed(2)}/分钟</div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>AI 今日评价</div>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: grade.accent, background: grade.bg, border: `1px solid ${grade.border}` }}
          >
            {grade.label}
          </span>
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {data.aiSuggestion}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>今日产值明细</div>
        {data.outputDetail.length === 0 ? (
          <div className="text-sm py-2" style={{ color: "var(--muted)" }}>暂无已审核产值数据</div>
        ) : (
          <div className="space-y-2">
            {data.outputDetail.map((item, idx) => (
              <div
                key={`${item.project}-${item.task}-${idx}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="min-w-0 pr-3">
                  <div className="text-sm text-white truncate">{item.project} / {item.task}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{item.qty}</div>
                </div>
                <div className="font-mono text-sm font-bold" style={{ color: "var(--accent)" }}>{fmtMoney(item.totalValue)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
