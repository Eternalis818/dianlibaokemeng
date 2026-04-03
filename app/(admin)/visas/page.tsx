"use client";
import { useState, useEffect, useCallback } from "react";

interface Visa {
  id: number;
  title: string;
  amount: number;
  submitter: string;
  project: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_MAP = {
  pending:  { label: "待批复", bg: "rgba(245,158,11,0.12)",  color: "var(--amber)" },
  approved: { label: "已批复", bg: "rgba(16,185,129,0.12)",  color: "var(--green)" },
  rejected: { label: "已驳回", bg: "rgba(239,68,68,0.1)",    color: "#ef4444"      },
};

const EMPTY_FORM = { title: "", amount: "", submitter: "", project: "" };

export default function VisasPage() {
  const [visas, setVisas] = useState<Visa[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/visas").then((r) => r.json());
      setVisas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setProjects(d);
          setForm((f) => ({ ...f, project: f.project || d[0].name }));
        }
      })
      .catch(() => {});
  }, [fetchAll]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.submitter.trim() || !form.project.trim()) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/visas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          amount: form.amount ? Number(form.amount) : 0,
          submitter: form.submitter.trim(),
          project: form.project.trim(),
        }),
      });
      if (res.ok) {
        setForm({ ...EMPTY_FORM, project: projects[0]?.name ?? "" });
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

  const update = async (id: number, status: "approved" | "rejected") => {
    setUpdateError(null);
    // Optimistic update
    setVisas((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    try {
      const res = await fetch(`/api/visas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "操作失败");
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "操作失败，请重试");
      fetchAll(); // revert optimistic update
    }
  };

  const pending = visas.filter((v) => v.status === "pending");
  const pendingTotal = pending.reduce((s, v) => s + v.amount, 0);

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">签证管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading
              ? "加载中..."
              : pending.length > 0
              ? `${pending.length} 项待批复 · 涉及 ¥${pendingTotal.toLocaleString()}`
              : `共 ${visas.length} 条记录`}
          </p>
        </div>
        <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowForm(true)}>+ 发起签证</button>
      </div>

      <div className="px-8 py-6 space-y-3">
        {/* Create Form */}
        {showForm && (
          <div className="glass rounded-xl p-5 mb-2" style={{ borderLeft: "2px solid var(--accent)" }}>
            <div className="text-sm font-semibold text-white mb-4">发起签证</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 mb-3">
              <div className="col-span-2">
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>签证标题 *</div>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="例：汇龙项目基础施工签证"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>金额（元）</div>
                <input
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="例：12000"
                  type="number"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>提交人 *</div>
                <input
                  value={form.submitter}
                  onChange={(e) => setForm((p) => ({ ...p, submitter: e.target.value }))}
                  placeholder="例：张三"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>所属项目 *</div>
                {projects.length > 0 ? (
                  <select
                    value={form.project}
                    onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.name} style={{ background: "#0d1929" }}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.project}
                    onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
                    placeholder="例：汇龙配电所改造"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                )}
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
                disabled={!form.title.trim() || !form.submitter.trim() || !form.project.trim() || submitting}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {submitting ? "提交中..." : "确认发起"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM, project: projects[0]?.name ?? "" }); setCreateError(null); }}
                className="btn-ghost text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {updateError && (
          <div
            className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <span className="text-sm" style={{ color: "#ef4444" }}>{updateError}</span>
            <button onClick={() => setUpdateError(null)} className="text-xs" style={{ color: "var(--muted)" }}>✕</button>
          </div>
        )}
        {/* Pending total banner */}
        {!loading && pending.length > 0 && (
          <div
            className="rounded-xl px-5 py-3 flex justify-between items-center"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <span className="text-sm" style={{ color: "var(--muted)" }}>待批复签证总额</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--accent)" }}>
              ¥{pendingTotal.toLocaleString()}
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Empty */}
        {!loading && visas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无签证记录</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>点击右上角发起新签证</span>
          </div>
        )}

        {/* Visa cards */}
        {visas.map((v) => {
          const s = STATUS_MAP[v.status];
          return (
            <div
              key={v.id}
              className="glass rounded-xl p-5"
              style={{
                borderLeft: v.status === "pending" ? "2px solid var(--amber)" : "2px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      #{String(v.id).padStart(3, "0")}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
                    >
                      {v.project}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm text-white mb-1 leading-snug">{v.title}</p>

                  {/* Footer */}
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {v.submitter} · {fmtDate(v.createdAt)}
                  </div>
                </div>

                {/* Amount + actions */}
                <div className="text-right shrink-0">
                  <div
                    className="text-lg font-mono font-bold"
                    style={{ color: v.status === "pending" ? "var(--amber)" : v.status === "approved" ? "var(--green)" : "#ef4444" }}
                  >
                    ¥{v.amount.toLocaleString()}
                  </div>
                  {v.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="btn-primary text-xs py-1.5 px-3"
                        onClick={() => update(v.id, "approved")}
                      >
                        批复
                      </button>
                      <button
                        className="btn-ghost text-xs"
                        onClick={() => update(v.id, "rejected")}
                      >
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
