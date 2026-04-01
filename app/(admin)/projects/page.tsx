"use client";
import { useState, useEffect, useCallback } from "react";

interface CheckIn {
  workerId: string;
  project: string;
}

const PROJECTS = [
  {
    id: "HLD-001",
    name: "汇龙配电所改造",
    status: "施工中",
    budget: 280000,
    spent: 134000,
    start: "2026-02-10",
    end: "2026-06-30",
  },
  {
    id: "XMP-002",
    name: "下马坪10kV主线",
    status: "施工中",
    budget: 196000,
    spent: 89000,
    start: "2026-03-01",
    end: "2026-07-15",
  },
  {
    id: "THS-003",
    name: "铁画溪开关站",
    status: "待开工",
    budget: 340000,
    spent: 0,
    start: "2026-05-01",
    end: "2026-10-30",
  },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  施工中: { bg: "rgba(16,185,129,0.12)", color: "var(--green)" },
  待开工: { bg: "rgba(245,158,11,0.12)", color: "var(--amber)" },
  已完工: { bg: "rgba(59,130,246,0.12)", color: "var(--accent)" },
};

export default function ProjectsPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    try {
      const data = await fetch("/api/checkin").then((r) => r.json());
      setCheckins(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
    const id = setInterval(fetchCheckins, 30000);
    return () => clearInterval(id);
  }, [fetchCheckins]);

  return (
    <div className="min-h-[100dvh] grid-bg">
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{
          background: "rgba(7,13,26,0.85)",
          borderColor: "var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">项目管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            共 {PROJECTS.length} 个项目
          </p>
        </div>
        <button className="btn-primary">+ 新建项目</button>
      </div>

      <div className="px-8 py-6 space-y-3">
        {PROJECTS.map((p) => {
          const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
          const uniqueWorkers = new Set(
            checkins.filter((ci) => ci.project === p.name).map((ci) => ci.workerId)
          );
          const liveWorkers = uniqueWorkers.size;
          const s = STATUS_STYLE[p.status] ?? STATUS_STYLE["已完工"];

          return (
            <div
              key={p.id}
              className="glass rounded-xl p-5 flex items-center gap-6 cursor-pointer transition-all"
              style={{
                borderLeft:
                  p.status === "施工中" ? "2px solid var(--accent)" : "2px solid var(--border)",
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-white">{p.name}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {p.id}
                  </span>
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {p.start} → {p.end} ·{" "}
                  {loading ? (
                    "—"
                  ) : liveWorkers > 0 ? (
                    <span style={{ color: "var(--green)" }}>{liveWorkers} 人今日在场</span>
                  ) : (
                    "今日暂无打卡"
                  )}
                </div>
              </div>
              <div className="w-40">
                <div
                  className="flex justify-between text-[11px] font-mono mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  <span>预算进度</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, var(--accent), #60a5fa)",
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono mt-1" style={{ color: "var(--muted)" }}>
                  ¥{(p.spent / 10000).toFixed(1)}万 / ¥{(p.budget / 10000).toFixed(0)}万
                </div>
              </div>
              <div className="text-right">
                <button className="btn-ghost text-xs">查看详情</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
