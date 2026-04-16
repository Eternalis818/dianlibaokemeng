"use client";
import { useState, useEffect, useCallback } from "react";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface Project {
  id: number;
  name: string;
  code: string;
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
  contractAmount: number;
  advancePaymentRatio: number;
  createdAt: string;
}

interface CheckIn {
  workerId: string;
  project: string;
}

interface ContractPaymentNode {
  id: number;
  projectId: number;
  nodeName: string;
  amount: number;
  receivedAmount: number;
  status: string;
  expectedDate: string | null;
  actualDate: string | null;
  note: string | null;
  attachments: string[];
}

interface ProjectExpenseItem {
  id: number;
  projectId: number;
  type: string;
  amount: number;
  expenseDate: string;
  handler: string | null;
  note: string | null;
  photoUrls: string[];
}

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: "施工中",
  pending: "待开工",
  completed: "已完工",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: "rgba(16,185,129,0.12)",  color: "var(--green)" },
  pending:   { bg: "rgba(245,158,11,0.12)",  color: "var(--amber)" },
  completed: { bg: "rgba(59,130,246,0.12)",  color: "var(--accent)" },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "待报审",
  processing: "报审中",
  completed: "已到账",
};

const PAYMENT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "rgba(245,158,11,0.12)", color: "var(--amber)" },
  processing: { bg: "rgba(59,130,246,0.12)", color: "var(--accent)" },
  completed:  { bg: "rgba(16,185,129,0.12)", color: "var(--green)" },
};

const EXPENSE_TYPE_LABEL: Record<string, string> = {
  material: "材料采购",
  machinery: "机械租赁",
  fine: "罚款/代扣",
  hospitality: "招待费",
  transport: "交通费",
  other: "其他",
};

const EXPENSE_TYPE_ICON: Record<string, string> = {
  material: "📦",
  machinery: "🏗️",
  fine: "⚠️",
  hospitality: "🍽️",
  transport: "🚗",
  other: "📝",
};

const EMPTY_FORM = {
  name: "", code: "", budget: "", profitRate: "", contractAmount: "", advancePaymentRatio: "", status: "active",
};

const EMPTY_PAYMENT = { nodeName: "", amount: "", expectedDate: "", note: "" };
const EMPTY_EXPENSE = { type: "material", amount: "", expenseDate: "", handler: "", note: "" };

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 项目详情展开状态
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"payments" | "expenses">("payments");
  const [payments, setPayments] = useState<ContractPaymentNode[]>([]);
  const [expenses, setExpenses] = useState<ProjectExpenseItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // 款项表单
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // 杂费表单
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // ── 数据加载 ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [projData, ciData] = await Promise.all([
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/checkin").then((r) => r.json()),
      ]);
      setProjects(Array.isArray(projData) ? projData : []);
      setCheckins(Array.isArray(ciData) ? ciData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const fetchDetail = useCallback(async (projectId: number) => {
    setDetailLoading(true);
    try {
      const [payData, expData] = await Promise.all([
        fetch(`/api/contract-payments?projectId=${projectId}`).then((r) => r.json()),
        fetch(`/api/project-expenses?projectId=${projectId}`).then((r) => r.json()),
      ]);
      setPayments(Array.isArray(payData) ? payData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── 项目 CRUD ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          budget: form.budget ? Number(form.budget) : 0,
          profitRate: form.profitRate ? Number(form.profitRate) : 0,
          contractAmount: form.contractAmount ? Number(form.contractAmount) : 0,
          advancePaymentRatio: form.advancePaymentRatio ? Number(form.advancePaymentRatio) : 0,
          status: form.status,
        }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error ?? `创建失败（HTTP ${res.status}）`);
      }
    } catch {
      setCreateError("网络错误，请检查连接后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确认删除项目「${name}」？该操作不可撤销。`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "删除失败");
      }
    } catch {
      alert("网络错误，删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } catch { /* silent */ }
  };

  // ── 展开/收起项目详情 ────────────────────────────────────────────────────
  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setPayments([]);
      setExpenses([]);
    } else {
      setExpandedId(id);
      setActiveTab("payments");
      setShowPaymentForm(false);
      setShowExpenseForm(false);
      fetchDetail(id);
    }
  };

  // ── 合同款项 CRUD ────────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    if (!paymentForm.nodeName.trim() || !paymentForm.amount) return;
    setPaymentSubmitting(true);
    try {
      const res = await fetch("/api/contract-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: expandedId,
          nodeName: paymentForm.nodeName.trim(),
          amount: Number(paymentForm.amount),
          expectedDate: paymentForm.expectedDate || null,
          note: paymentForm.note || null,
        }),
      });
      if (res.ok) {
        setPaymentForm(EMPTY_PAYMENT);
        setShowPaymentForm(false);
        if (expandedId) fetchDetail(expandedId);
      }
    } catch { /* silent */ }
    setPaymentSubmitting(false);
  };

  const handleUpdatePaymentStatus = async (id: number, status: string, receivedAmount?: number) => {
    try {
      const body: Record<string, unknown> = { id, status };
      if (status === "completed" && receivedAmount !== undefined) {
        body.receivedAmount = receivedAmount;
        body.actualDate = new Date().toISOString();
      }
      await fetch("/api/contract-payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (expandedId) fetchDetail(expandedId);
    } catch { /* silent */ }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm("确认删除该款项节点？")) return;
    try {
      await fetch(`/api/contract-payments?id=${id}`, { method: "DELETE" });
      if (expandedId) fetchDetail(expandedId);
    } catch { /* silent */ }
  };

  // ── 项目杂费 CRUD ────────────────────────────────────────────────────────
  const handleAddExpense = async () => {
    if (!expenseForm.type || !expenseForm.amount) return;
    setExpenseSubmitting(true);
    try {
      const res = await fetch("/api/project-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: expandedId,
          type: expenseForm.type,
          amount: Number(expenseForm.amount),
          expenseDate: expenseForm.expenseDate || new Date().toISOString().slice(0, 10),
          handler: expenseForm.handler || null,
          note: expenseForm.note || null,
        }),
      });
      if (res.ok) {
        setExpenseForm(EMPTY_EXPENSE);
        setShowExpenseForm(false);
        if (expandedId) fetchDetail(expandedId);
      }
    } catch { /* silent */ }
    setExpenseSubmitting(false);
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("确认删除该杂费记录？")) return;
    try {
      await fetch(`/api/project-expenses?id=${id}`, { method: "DELETE" });
      if (expandedId) fetchDetail(expandedId);
    } catch { /* silent */ }
  };

  // ── 计算汇总 ─────────────────────────────────────────────────────────────
  const totalPaymentExpected = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaymentReceived = payments.reduce((s, p) => s + p.receivedAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // ─── 渲染 ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* 顶部栏 */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">项目管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `共 ${projects.length} 个项目`}
          </p>
        </div>
        <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowForm(true)}>
          + 新建项目
        </button>
      </div>

      <div className="px-8 py-6 space-y-3">
        {/* 创建表单 */}
        {showForm && (
          <div className="glass rounded-xl p-5 mb-2" style={{ borderLeft: "2px solid var(--accent)" }}>
            <div className="text-sm font-semibold text-white mb-4">新建项目</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
              {[
                { key: "name",       label: "项目名称 *", placeholder: "例：汇龙配电所改造", type: "text" },
                { key: "code",       label: "项目编号 *", placeholder: "例：HLK-2024-01", type: "text" },
                { key: "budget",     label: "预算（元）",  placeholder: "例：500000", type: "number" },
                { key: "profitRate", label: "利润率（%）", placeholder: "例：18", type: "number" },
                { key: "contractAmount",     label: "合同暂定价（元）", placeholder: "例：800000", type: "number" },
                { key: "advancePaymentRatio", label: "预付款比例（%）", placeholder: "例：10", type: "number" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    type={type}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              ))}
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>初始状态</div>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <option value="active" style={{ background: "#0d1929" }}>施工中</option>
                  <option value="pending" style={{ background: "#0d1929" }}>待开工</option>
                  <option value="completed" style={{ background: "#0d1929" }}>已完工</option>
                </select>
              </div>
            </div>
            {createError && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                {createError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || !form.code.trim() || submitting}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "创建中..." : "确认创建"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setCreateError(null); }}
                className="btn-ghost text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 加载中 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无项目，点击右上角新建</span>
          </div>
        ) : (
          projects.map((p) => {
            const pct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
            const uniqueWorkers = new Set(
              checkins.filter((ci) => ci.project === p.name).map((ci) => ci.workerId)
            );
            const liveWorkers = uniqueWorkers.size;
            const ss = STATUS_STYLE[p.status] ?? STATUS_STYLE.completed;
            const startDate = new Date(p.createdAt).toISOString().slice(0, 10);
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id}>
                {/* 项目卡片 */}
                <div
                  className="glass rounded-xl p-5 cursor-pointer"
                  style={{
                    borderLeft: p.status === "active" ? "2px solid var(--accent)" : "2px solid var(--border)",
                    borderBottomLeftRadius: isExpanded ? 0 : undefined,
                    borderBottomRightRadius: isExpanded ? 0 : undefined,
                  }}
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="flex items-center gap-6">
                    {/* 信息区 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-medium text-white">{p.name}</span>
                        <select
                          value={p.status}
                          onChange={(e) => { e.stopPropagation(); handleStatusChange(p.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] px-2 py-0.5 rounded-full font-mono outline-none cursor-pointer"
                          style={{ background: ss.bg, color: ss.color, border: "none" }}
                        >
                          <option value="active" style={{ background: "#0d1929" }}>施工中</option>
                          <option value="pending" style={{ background: "#0d1929" }}>待开工</option>
                          <option value="completed" style={{ background: "#0d1929" }}>已完工</option>
                        </select>
                        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{p.code}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        建档 {startDate} ·{" "}
                        {liveWorkers > 0
                          ? <span style={{ color: "var(--green)" }}>{liveWorkers} 人今日在场</span>
                          : "今日暂无打卡"}
                        {p.profitRate > 0 && <span> · 利润率 {p.profitRate}%</span>}
                        {p.contractAmount > 0 && (
                          <span> · 合同暂定价 <span style={{ color: "var(--accent)" }}>¥{(p.contractAmount / 10000).toFixed(1)}万</span></span>
                        )}
                        {p.advancePaymentRatio > 0 && (
                          <span> · 预付款 {p.advancePaymentRatio}%</span>
                        )}
                      </div>
                    </div>

                    {/* 预算进度 */}
                    <div className="w-36 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between text-[11px] font-mono mb-1.5" style={{ color: "var(--muted)" }}>
                        <span>预算进度</span><span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: pct >= 90 ? "linear-gradient(90deg,#ef4444,#f87171)" : "linear-gradient(90deg,var(--accent),#60a5fa)",
                          }}
                        />
                      </div>
                      <div className="text-[11px] font-mono mt-1" style={{ color: "var(--muted)" }}>
                        ¥{(p.spent / 10000).toFixed(1)}万 / ¥{(p.budget / 10000).toFixed(0)}万
                      </div>
                    </div>

                    {/* 展开/收起 + 删除 */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span
                        className="text-xs px-2 py-1 rounded-lg transition-all"
                        style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                      >
                        {isExpanded ? "收起 ▲" : "详情 ▼"}
                      </span>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deletingId === p.id}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                        style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                      >
                        {deletingId === p.id ? "删除中" : "删除"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 项目详情展开区 ──────────────────────────────────────── */}
                {isExpanded && (
                  <div
                    className="glass rounded-b-xl p-5 pt-4"
                    style={{ borderTop: "1px solid var(--border)", borderLeft: "2px solid var(--accent)" }}
                  >
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                        <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>加载详情...</span>
                      </div>
                    ) : (
                      <>
                        {/* 汇总卡片 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                          <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                            <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>合同暂定价</div>
                            <div className="text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
                              ¥{((p.contractAmount || 0) / 10000).toFixed(1)}万
                            </div>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                            <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>已报审款项</div>
                            <div className="text-sm font-mono font-semibold" style={{ color: "var(--amber)" }}>
                              ¥{(totalPaymentExpected / 10000).toFixed(1)}万
                            </div>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                            <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>已到账</div>
                            <div className="text-sm font-mono font-semibold" style={{ color: "var(--green)" }}>
                              ¥{(totalPaymentReceived / 10000).toFixed(1)}万
                            </div>
                          </div>
                          <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                            <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>项目杂费</div>
                            <div className="text-sm font-mono font-semibold" style={{ color: "#f87171" }}>
                              ¥{(totalExpenses / 10000).toFixed(1)}万
                            </div>
                          </div>
                        </div>

                        {/* Tab 切换 */}
                        <div className="flex gap-1 mb-4">
                          {(["payments", "expenses"] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => { setActiveTab(tab); setShowPaymentForm(false); setShowExpenseForm(false); }}
                              className="text-xs px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                background: activeTab === tab ? "rgba(59,130,246,0.15)" : "transparent",
                                color: activeTab === tab ? "var(--accent)" : "var(--muted)",
                                border: activeTab === tab ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
                              }}
                            >
                              {tab === "payments" ? `合同款项 (${payments.length})` : `杂费记录 (${expenses.length})`}
                            </button>
                          ))}
                        </div>

                        {/* ── 合同款项管理 ─────────────────────────────────────── */}
                        {activeTab === "payments" && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-white">款项节点</span>
                              <button
                                onClick={() => setShowPaymentForm(true)}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ color: "var(--accent)", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                              >
                                + 添加款项
                              </button>
                            </div>

                            {/* 添加款项表单 */}
                            {showPaymentForm && (
                              <div className="rounded-lg p-4 mb-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>节点名称 *</div>
                                    <input
                                      value={paymentForm.nodeName}
                                      onChange={(e) => setPaymentForm((p) => ({ ...p, nodeName: e.target.value }))}
                                      placeholder="例：预付款"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>申报金额（元）*</div>
                                    <input
                                      value={paymentForm.amount}
                                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                                      placeholder="例：80000"
                                      type="number"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>预计报审日期</div>
                                    <input
                                      value={paymentForm.expectedDate}
                                      onChange={(e) => setPaymentForm((p) => ({ ...p, expectedDate: e.target.value }))}
                                      type="date"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>备注</div>
                                    <input
                                      value={paymentForm.note}
                                      onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
                                      placeholder="可选"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleAddPayment}
                                    disabled={!paymentForm.nodeName.trim() || !paymentForm.amount || paymentSubmitting}
                                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                                  >
                                    {paymentSubmitting ? "提交中..." : "确认添加"}
                                  </button>
                                  <button
                                    onClick={() => { setShowPaymentForm(false); setPaymentForm(EMPTY_PAYMENT); }}
                                    className="btn-ghost text-xs"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 款项列表 */}
                            {payments.length === 0 ? (
                              <div className="text-xs py-6 text-center" style={{ color: "var(--muted)" }}>
                                暂无款项记录，点击上方「添加款项」创建第一个节点
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {payments.map((pm) => {
                                  const pmSs = PAYMENT_STATUS_STYLE[pm.status] ?? PAYMENT_STATUS_STYLE.pending;
                                  const isOverdue = pm.status !== "completed" && pm.expectedDate && new Date(pm.expectedDate) < new Date();
                                  return (
                                    <div
                                      key={pm.id}
                                      className="flex items-center gap-4 rounded-lg p-3"
                                      style={{ background: "var(--surface2)" }}
                                    >
                                      {/* 状态点 */}
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pmSs.color }} />

                                      {/* 节点名 */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-white">{pm.nodeName}</span>
                                          <select
                                            value={pm.status}
                                            onChange={(e) => handleUpdatePaymentStatus(pm.id, e.target.value, pm.amount)}
                                            className="text-[10px] px-1.5 py-0.5 rounded-full outline-none cursor-pointer"
                                            style={{ background: pmSs.bg, color: pmSs.color, border: "none" }}
                                          >
                                            <option value="pending" style={{ background: "#0d1929" }}>待报审</option>
                                            <option value="processing" style={{ background: "#0d1929" }}>报审中</option>
                                            <option value="completed" style={{ background: "#0d1929" }}>已到账</option>
                                          </select>
                                          {isOverdue && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                                              已逾期
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                                          申报 ¥{pm.amount.toLocaleString()}
                                          {pm.receivedAmount > 0 && <span> · 到账 <span style={{ color: "var(--green)" }}>¥{pm.receivedAmount.toLocaleString()}</span></span>}
                                          {pm.expectedDate && <span> · 预计 {pm.expectedDate.slice(0, 10)}</span>}
                                          {pm.actualDate && <span> · 实际到账 {pm.actualDate.slice(0, 10)}</span>}
                                          {pm.note && <span> · {pm.note}</span>}
                                        </div>
                                      </div>

                                      {/* 删除 */}
                                      <button
                                        onClick={() => handleDeletePayment(pm.id)}
                                        className="text-[10px] px-2 py-1 rounded-lg shrink-0"
                                        style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)" }}
                                      >
                                        删除
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── 杂费记录 ─────────────────────────────────────────── */}
                        {activeTab === "expenses" && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-white">杂费明细</span>
                              <button
                                onClick={() => setShowExpenseForm(true)}
                                className="text-xs px-3 py-1.5 rounded-lg"
                                style={{ color: "var(--accent)", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
                              >
                                + 记录杂费
                              </button>
                            </div>

                            {/* 添加杂费表单 */}
                            {showExpenseForm && (
                              <div className="rounded-lg p-4 mb-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-3">
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>费用类型 *</div>
                                    <select
                                      value={expenseForm.type}
                                      onChange={(e) => setExpenseForm((p) => ({ ...p, type: e.target.value }))}
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    >
                                      {Object.entries(EXPENSE_TYPE_LABEL).map(([k, v]) => (
                                        <option key={k} value={k} style={{ background: "#0d1929" }}>{v}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>金额（元）*</div>
                                    <input
                                      value={expenseForm.amount}
                                      onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                                      placeholder="例：5000"
                                      type="number"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>费用日期</div>
                                    <input
                                      value={expenseForm.expenseDate}
                                      onChange={(e) => setExpenseForm((p) => ({ ...p, expenseDate: e.target.value }))}
                                      type="date"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>经办人</div>
                                    <input
                                      value={expenseForm.handler}
                                      onChange={(e) => setExpenseForm((p) => ({ ...p, handler: e.target.value }))}
                                      placeholder="可选"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>费用说明</div>
                                    <input
                                      value={expenseForm.note}
                                      onChange={(e) => setExpenseForm((p) => ({ ...p, note: e.target.value }))}
                                      placeholder="例：租赁吊车2天"
                                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleAddExpense}
                                    disabled={!expenseForm.amount || expenseSubmitting}
                                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                                  >
                                    {expenseSubmitting ? "提交中..." : "确认记录"}
                                  </button>
                                  <button
                                    onClick={() => { setShowExpenseForm(false); setExpenseForm(EMPTY_EXPENSE); }}
                                    className="btn-ghost text-xs"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 杂费列表 */}
                            {expenses.length === 0 ? (
                              <div className="text-xs py-6 text-center" style={{ color: "var(--muted)" }}>
                                暂无杂费记录，点击上方「记录杂费」添加
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {expenses.map((exp) => (
                                  <div
                                    key={exp.id}
                                    className="flex items-center gap-3 rounded-lg p-3"
                                    style={{ background: "var(--surface2)" }}
                                  >
                                    <span className="text-base shrink-0">{EXPENSE_TYPE_ICON[exp.type] ?? "📝"}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-white">
                                          {EXPENSE_TYPE_LABEL[exp.type] ?? exp.type}
                                        </span>
                                        <span className="text-xs font-mono" style={{ color: "#f87171" }}>
                                          -¥{exp.amount.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                                        {exp.expenseDate.slice(0, 10)}
                                        {exp.handler && <span> · {exp.handler}</span>}
                                        {exp.note && <span> · {exp.note}</span>}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteExpense(exp.id)}
                                      className="text-[10px] px-2 py-1 rounded-lg shrink-0"
                                      style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)" }}
                                    >
                                      删除
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
