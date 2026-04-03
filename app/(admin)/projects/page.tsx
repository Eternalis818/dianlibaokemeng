"use client";
import { useState, useEffect, useCallback } from "react";

interface Project {
  id: number;
  name: string;
  code: string;
  budget: number;
  spent: number;
  profitRate: number;
  status: string;
  createdAt: string;
}

interface CheckIn {
  workerId: string;
  project: string;
}

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

const EMPTY_FORM = { name: "", code: "", budget: "", profitRate: "", status: "active" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  return (
    <div className="min-h-[100dvh] grid-bg">
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
        {/* Create Form */}
        {showForm && (
          <div className="glass rounded-xl p-5 mb-2" style={{ borderLeft: "2px solid var(--accent)" }}>
            <div className="text-sm font-semibold text-white mb-4">新建项目</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
              {[
                { key: "name",       label: "项目名称 *", placeholder: "例：汇龙配电所改造" },
                { key: "code",       label: "项目编号 *", placeholder: "例：HLK-2024-01" },
                { key: "budget",     label: "预算（元）",  placeholder: "例：500000" },
                { key: "profitRate", label: "利润率（%）", placeholder: "例：18" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    type={key === "budget" || key === "profitRate" ? "number" : "text"}
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

        {/* Loading */}
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

            return (
              <div
                key={p.id}
                className="glass rounded-xl p-5"
                style={{ borderLeft: p.status === "active" ? "2px solid var(--accent)" : "2px solid var(--border)" }}
              >
                <div className="flex items-center gap-6">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-medium text-white">{p.name}</span>
                      {/* Inline status selector */}
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
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
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="w-36 shrink-0">
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

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deletingId === p.id}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 shrink-0"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    {deletingId === p.id ? "删除中" : "删除"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
