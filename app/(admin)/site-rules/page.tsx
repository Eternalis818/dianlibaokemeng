"use client";
import { useState, useEffect, useCallback } from "react";

interface Rule {
  id: number; title: string; content: string; version: number; isActive: boolean; createdAt: string; updatedAt: string;
}

export default function SiteRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/site-rules").then((r) => r.json());
      if (Array.isArray(data)) setRules(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => {
    setTitle(""); setContent(""); setShowForm(false); setEditing(null);
  };

  const openEdit = (r: Rule) => {
    setEditing(r); setTitle(r.title); setContent(r.content); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/site-rules/${editing.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content: content.trim() }),
          })
        : await fetch("/api/site-rules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content: content.trim() }),
          });
      if (res.ok) { resetForm(); fetchAll(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleToggle = async (r: Rule) => {
    try {
      await fetch(`/api/site-rules/${r.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该规则？")) return;
    try {
      await fetch(`/api/site-rules/${id}`, { method: "DELETE" });
      fetchAll();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">进场须知</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>工人入场前需确认的规则，编辑后版本号+1需重新确认</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm px-4 py-2">+ 新增规则</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-5 space-y-3" style={{ borderLeft: "2px solid var(--accent)" }}>
          <div className="text-sm font-semibold text-white">{editing ? `编辑 — ${editing.title}` : "新增规则"}</div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>标题 *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：安全须知"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>内容 *</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="详细规则内容..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          {editing && (
            <div className="text-xs" style={{ color: "var(--amber)" }}>
              ⚠ 修改内容将触发版本号+1，所有工人需重新确认
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? "保存中..." : editing ? "确认修改" : "确认创建"}
            </button>
            <button onClick={resetForm} className="btn-ghost text-sm">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无进场须知规则</div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{r.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.2)" }}>
                    v{r.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(r)} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      color: r.isActive ? "var(--green)" : "var(--muted)",
                      background: r.isActive ? "rgba(16,185,129,0.1)" : "var(--bg)",
                    }}>
                    {r.isActive ? "启用" : "停用"}
                  </button>
                  <button onClick={() => openEdit(r)} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    编辑
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    删除
                  </button>
                </div>
              </div>
              <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--muted)" }}>{r.content}</div>
              <div className="text-[10px] mt-2" style={{ color: "rgba(148,163,184,0.5)" }}>
                更新于 {new Date(r.updatedAt).toLocaleDateString("zh-CN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
