const summary = [
  { label: "本月预计结算产值", value: "¥241,280", color: "var(--accent)" },
  { label: "本月人工费", value: "¥136,400", color: "var(--text)" },
  { label: "本月材料费", value: "¥48,200", color: "var(--text)" },
  { label: "基地均摊费", value: "¥12,600", color: "var(--text)" },
  { label: "实时利润", value: "¥44,080", color: "var(--green)" },
  { label: "综合利润率", value: "18.3%", color: "var(--green)" },
];

const baseItems = [
  { label: "年度场地租金", total: 48000, monthly: 4000 },
  { label: "工人伙食费", total: 86400, monthly: 7200 },
  { label: "住宿费", total: 36000, monthly: 3000 },
];

export default function FinancePage() {
  return (
    <div className="min-h-[100dvh] grid-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">财务核算</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>2026年4月 · 实时盈亏</p>
        </div>
        <button className="btn-primary">导出报表</button>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* 盈亏汇总 */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-white mb-4">本月盈亏汇总</h2>
          <div className="grid grid-cols-3 gap-4">
            {summary.map((s) => (
              <div key={s.label} className="glass-sm rounded-lg p-4">
                <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{s.label}</div>
                <div className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 利润公式 */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-white mb-4">实时利润计算公式</h2>
          <div className="font-mono text-sm p-4 rounded-lg" style={{ background: "var(--surface2)", color: "var(--text)" }}>
            实时利润 = 预计结算产值 − (人工费 + 材料费 + 机械费 + 基地均摊费)
          </div>
          <div className="mt-3 font-mono text-sm" style={{ color: "var(--green)" }}>
            ¥44,080 = ¥241,280 − (¥136,400 + ¥48,200 + ¥0 + ¥12,600)
          </div>
        </div>

        {/* 基地费用分摊 */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-medium text-white mb-4">基地固定费用分摊</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-left border-b" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
                <th className="pb-3 font-normal">费用项目</th>
                <th className="pb-3 font-normal text-right">年度总额</th>
                <th className="pb-3 font-normal text-right">月均分摊</th>
              </tr>
            </thead>
            <tbody>
              {baseItems.map((item, i) => (
                <tr key={i} className="text-xs border-t" style={{ borderColor: "rgba(59,130,246,0.08)" }}>
                  <td className="py-3" style={{ color: "var(--text)" }}>{item.label}</td>
                  <td className="py-3 font-mono text-right" style={{ color: "var(--muted)" }}>¥{item.total.toLocaleString()}</td>
                  <td className="py-3 font-mono text-right" style={{ color: "var(--amber)" }}>¥{item.monthly.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
