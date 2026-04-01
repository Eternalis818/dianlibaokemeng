const months = [
  { m: "1月", output: 0, profit: 0, workers: 0 },
  { m: "2月", output: 85000, profit: 14200, workers: 8 },
  { m: "3月", output: 196000, profit: 35800, workers: 12 },
  { m: "4月", output: 45280, profit: 8340, workers: 12 },
];

const maxOutput = Math.max(...months.map(m => m.output));

const annual = [
  { label: "年度累计产值", value: "¥326,280", color: "var(--accent)" },
  { label: "年度累计利润", value: "¥58,340", color: "var(--green)" },
  { label: "综合利润率", value: "17.9%", color: "var(--green)" },
  { label: "累计工人工日", value: "864 工日", color: "var(--text)" },
];

export default function AnnualPage() {
  return (
    <div className="min-h-[100dvh] grid-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">年度汇总</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>2026年度 · 截至今日</p>
        </div>
        <button className="btn-primary">导出年报</button>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* 年度指标 */}
        <div className="grid grid-cols-4 gap-4">
          {annual.map((a) => (
            <div key={a.label} className="glass-sm rounded-xl p-5">
              <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{a.label}</div>
              <div className="text-xl font-mono font-bold" style={{ color: a.color }}>{a.value}</div>
            </div>
          ))}
        </div>

        {/* 月度产值柱状图 */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-white mb-6">月度产值趋势</h2>
          <div className="flex items-end gap-6 h-40">
            {months.map((m) => {
              const h = maxOutput > 0 ? Math.round((m.output / maxOutput) * 100) : 0;
              return (
                <div key={m.m} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-mono" style={{ color: "var(--green)" }}>
                    {m.output > 0 ? `¥${(m.output / 10000).toFixed(1)}万` : "—"}
                  </div>
                  <div className="w-full flex items-end" style={{ height: "100px" }}>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${h}%`,
                        minHeight: m.output > 0 ? "4px" : "0",
                        background: "linear-gradient(180deg, var(--accent), rgba(59,130,246,0.3))",
                      }}
                    />
                  </div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{m.m}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
