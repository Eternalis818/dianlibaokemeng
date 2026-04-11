"use client";
import { useState, useEffect, useCallback } from "react";

const CATEGORIES = ["工资", "材料费", "房租", "水电", "挂靠费", "茶水费", "其他"] as const;

interface Expense {
  id: number;
  category: string;
  amount: number;
  note: string | null;
  projectCode: string | null;
  projectName: string | null;
  expenseDate: string;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
}

export default function AccountingTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<{ total: number; byCategory: Record<string, number>; byProject: Record<string, number> } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [category, setCategory] = useState<string>("工资");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [projectCode, setProjectCode] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [exRes, sumRes, projRes] = await Promise.all([
        fetch("/api/boss/expenses?limit=100"),
        fetch("/api/boss/expenses/summary"),
        fetch("/api/projects"),
      ]);
      const exData = await exRes.json();
      const sumData = await sumRes.json();
      const projData = await projRes.json();
      if (Array.isArray(exData)) setExpenses(exData);
      if (sumData.total !== undefined) setSummary(sumData);
      if (Array.isArray(projData)) setProjects(projData);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      const proj = projects.find((p) => p.code === projectCode);
      await fetch("/api/boss/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          note: note || null,
          projectCode: projectCode || null,
          projectName: proj?.name || null,
          expenseDate,
        }),
      });
      setAmount(""); setNote(""); setProjectCode(""); setShowForm(false);
      fetchAll();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const catColor = (cat: string) => {
    const map: Record<string, string> = {
      "工资": "#60a5fa", "材料费": "#f472b6", "房租": "#c084fc",
      "水电": "#fbbf24", "挂靠费": "#fb923c", "茶水费": "#34d399", "其他": "#94a3b8",
    };
    return map[cat] || "#94a3b8";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm" style={{ color: "var(--muted)" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
      {/* 总览卡片 */}
      {summary && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>累计支出</span>
            <span className="font-mono font-bold text-xl" style={{ color: "#f87171" }}>
              ¥{summary.total.toLocaleString()}
            </span>
          </div>
          {/* 分类汇总 */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.byCategory).map(([cat, val]) => (
              <span
                key={cat}
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: `${catColor(cat)}15`, color: catColor(cat), border: `1px solid ${catColor(cat)}30` }}
              >
                {cat} ¥{val.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 账目列表 */}
      <div>
        <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>近期账目 · {expenses.length} 条</div>
        <div className="space-y-2">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${catColor(e.category)}15`, color: catColor(e.category) }}
                >
                  {e.category}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{e.note || e.category}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {e.expenseDate.slice(0, 10)}
                    {e.projectName && ` · ${e.projectName}`}
                  </div>
                </div>
              </div>
              <span className="font-mono font-bold text-sm shrink-0" style={{ color: "#f87171" }}>
                -¥{e.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {expenses.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无记账记录，点击下方按钮记一笔</span>
          </div>
        )}
      </div>

      {/* 记一笔 FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg transition-all active:scale-90 z-10"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", boxShadow: "0 4px 24px rgba(139,92,246,0.4)" }}
      >
        +
      </button>

      {/* 记一笔弹窗 */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="rounded-t-3xl p-6 pb-10 space-y-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--border)" }} />
            <div className="text-lg font-bold text-white">记一笔</div>

            {/* 分类选择 */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all"
                  style={{
                    background: category === c ? `${catColor(c)}20` : "transparent",
                    border: `1px solid ${category === c ? catColor(c) : "var(--border)"}`,
                    color: category === c ? catColor(c) : "var(--muted)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* 金额 */}
            <div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="金额（元）"
                className="w-full px-4 py-3 rounded-xl text-lg font-mono"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
              />
            </div>

            {/* 备注 */}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注（选填）"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />

            {/* 归属项目 */}
            <div>
              <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>归属项目</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setProjectCode("")}
                  className="px-3 py-1.5 rounded-full text-xs transition-all"
                  style={{
                    background: !projectCode ? "rgba(59,130,246,0.15)" : "transparent",
                    border: `1px solid ${!projectCode ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                    color: !projectCode ? "white" : "var(--muted)",
                  }}
                >
                  总账（未分配）
                </button>
                {projects.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => setProjectCode(p.code)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{
                      background: projectCode === p.code ? "rgba(59,130,246,0.15)" : "transparent",
                      border: `1px solid ${projectCode === p.code ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                      color: projectCode === p.code ? "white" : "var(--muted)",
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 日期 */}
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />

            {/* 提交 */}
            <button
              onClick={handleSave}
              disabled={saving || !amount}
              className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-98"
              style={{
                background: saving ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                boxShadow: saving ? "none" : "0 0 24px rgba(139,92,246,0.3)",
              }}
            >
              {saving ? "保存中..." : "确认记账"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
