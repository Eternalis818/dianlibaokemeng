"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: string;
  name: string;
  project: string;
  phone?: string | null;
  idCard?: string | null;
  wageType?: string | null;
  wageRate?: number | null;
  loginPin?: string | null;
  rewardPoints?: number;
  penaltyPoints?: number;
  isLocked?: boolean;
}

interface Project {
  id: number;
  name: string;
  code: string;
}

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [phone, setPhone] = useState("");
  const [idCard, setIdCard] = useState("");
  const [wageType, setWageType] = useState<string>("");
  const [wageRate, setWageRate] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/workers").then((r) => r.json());
      setWorkers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setProjects(d);
          if (d.length > 0 && !project) setProject(d[0].name);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName(""); setPhone(""); setIdCard(""); setProject("");
    setWageType(""); setWageRate(""); setLoginPin("");
    setError(null); setShowForm(false); setEditingWorker(null);
  };

  const openEdit = (w: Worker) => {
    setEditingWorker(w);
    setName(w.name); setProject(w.project); setPhone(w.phone || "");
    setIdCard(w.idCard || ""); setWageType(w.wageType || "");
    setWageRate(w.wageRate?.toString() || ""); setLoginPin(w.loginPin || "");
    setError(null); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !project.trim()) return;
    setSubmitting(true); setError(null);
    const payload = {
      name: name.trim(), project: project.trim(),
      phone: phone.trim() || null, idCard: idCard.trim() || null,
      wageType: wageType || null, wageRate: wageRate ? parseFloat(wageRate) : null,
      loginPin: loginPin.trim() || null,
    };
    try {
      const res = editingWorker
        ? await fetch(`/api/workers/${editingWorker.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await fetch("/api/workers", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
      if (res.ok) { resetForm(); fetchAll(); }
      else { const err = await res.json().catch(() => ({})); setError(err.error ?? `操作失败（HTTP ${res.status}）`); }
    } catch { setError("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除该工人？此操作无法撤销。")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? "删除失败"); return; }
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    } catch { alert("删除失败"); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ background: "rgba(7,13,26,0.85)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">工人管理</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {loading ? "加载中..." : `共 ${workers.length} 名工人`}
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm px-4 py-2">
          + 新增工人
        </button>
      </div>

      <div className="px-8 py-6">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="glass rounded-xl p-5 mb-6" style={{ borderLeft: "2px solid var(--accent)" }}>
            <div className="text-sm font-semibold text-white mb-4">
              {editingWorker ? `编辑 — ${editingWorker.name}` : "新增工人"}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>姓名 *</div>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：张三"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>所属项目 *</div>
                {projects.length > 0 ? (
                  <select value={project} onChange={(e) => setProject(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {projects.map((p) => (<option key={p.id} value={p.name} style={{ background: "#0d1929" }}>{p.name}</option>))}
                  </select>
                ) : (
                  <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="项目名"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                )}
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>手机号</div>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="13x..."
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>身份证号</div>
                <input value={idCard} onChange={(e) => setIdCard(e.target.value)} placeholder="选填"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>计薪方式</div>
                <select value={wageType} onChange={(e) => setWageType(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  <option value="" style={{ background: "#0d1929" }}>未设置</option>
                  <option value="daily" style={{ background: "#0d1929" }}>日薪</option>
                  <option value="monthly" style={{ background: "#0d1929" }}>月薪</option>
                  <option value="piecework" style={{ background: "#0d1929" }}>计件</option>
                </select>
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>薪资标准</div>
                <input type="number" value={wageRate} onChange={(e) => setWageRate(e.target.value)} placeholder="元/天 或 元/月"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>登录 PIN</div>
                <input value={loginPin} onChange={(e) => setLoginPin(e.target.value)} placeholder="默认手机后4位"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            </div>
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSubmit} disabled={!name.trim() || !project.trim() || submitting}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {submitting ? "保存中..." : editingWorker ? "确认修改" : "确认创建"}
              </button>
              <button onClick={resetForm} className="btn-ghost text-sm">取消</button>
            </div>
          </div>
        )}

        {/* Workers List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无工人记录</span>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm px-4 py-2 mt-2">
              + 新增第一个工人
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {workers.map((w) => (
              <div key={w.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                    >
                      {w.name[0]}
                    </div>
                    {w.isLocked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                        style={{ background: "#ef4444", color: "#fff" }}>锁</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="cursor-pointer hover:underline" onClick={() => router.push(`/workers/${w.id}`)}>{w.name}</span>
                      {w.wageType && w.wageRate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-normal"
                          style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          {w.wageType === "daily" ? "日薪" : w.wageType === "monthly" ? "月薪" : "计件"} ¥{w.wageRate}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                      <span>{w.project}</span>
                      {w.phone && <span>· {w.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 积分徽章 */}
                  {(w.rewardPoints ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                      +{w.rewardPoints}
                    </span>
                  )}
                  {(w.penaltyPoints ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      -{w.penaltyPoints}分
                    </span>
                  )}
                  <button onClick={() => router.push(`/workers/${w.id}`)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ color: "var(--green)", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    详情
                  </button>
                  <button onClick={() => openEdit(w)}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all"
                    style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    编辑
                  </button>
                  <button onClick={() => handleDelete(w.id)} disabled={deletingId === w.id}
                    className="text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    {deletingId === w.id ? "删除中" : "删除"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
