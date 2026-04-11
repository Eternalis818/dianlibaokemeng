"use client";
import { useState, useEffect, useCallback } from "react";

interface Category {
  id: number; name: string; points: number; description: string | null; isActive: boolean;
}

export default function PenaltiesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/penalty-categories").then((r) => r.json());
      if (Array.isArray(data)) setCategories(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!name.trim() || !points) return;
    setSaving(true);
    try {
      const res = await fetch("/api/penalty-categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), points: parseInt(points), description: desc.trim() || null }),
      });
      if (res.ok) { setName(""); setPoints(""); setDesc(""); setShowForm(false); fetchAll(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const pointColor = (p: number) => {
    if (p >= 12) return "#ef4444";
    if (p >= 6) return "#f97316";
    if (p >= 3) return "#f59e0b";
    return "#60a5fa";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">违规扣分</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>累计扣满 12 分将触发安规学习</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">+ 新增类别</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-5 space-y-3" style={{ borderLeft: "2px solid var(--amber)" }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>违章名称 *</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：未佩戴安全帽"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <div>
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>扣分值 *</div>
              <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="1-12"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <div>
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>说明</div>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="选填"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!name.trim() || !points || saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? "保存中..." : "确认"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: `${pointColor(c.points)}15`, color: pointColor(c.points) }}>
                  {c.points}分
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{c.name}</div>
                  {c.description && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{c.description}</div>}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ color: c.isActive ? "var(--green)" : "var(--muted)", background: c.isActive ? "rgba(16,185,129,0.1)" : "var(--bg)" }}>
                {c.isActive ? "启用" : "停用"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
