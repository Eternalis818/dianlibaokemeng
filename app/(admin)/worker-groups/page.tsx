"use client";
import { useState, useEffect, useCallback } from "react";

// ─── 类型 ──────────────────────────────────────────────────────────────
interface Worker {
  id: number;
  name: string;
  phone: string;
  project: string | null;
}

interface GroupMember {
  id: number;
  workerId: number;
  role: string | null;
  addedAt: string;
  worker: Worker;
}

interface WorkerGroup {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  members: GroupMember[];
}

// ─── 主页面 ────────────────────────────────────────────────────────────
export default function WorkerGroupsPage() {
  const [groups, setGroups] = useState<WorkerGroup[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkerGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [gRes, wRes] = await Promise.all([
        fetch("/api/worker-groups"),
        fetch("/api/workers"),
      ]);
      const gData = await gRes.json();
      const wData = await wRes.json();
      if (Array.isArray(gData)) setGroups(gData);
      if (Array.isArray(wData)) setWorkers(wData);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/worker-groups/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
      }
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">工人班组</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            预设班组，派工时快速选择整组工人
          </p>
        </div>
        <button
          onClick={() => { setEditingGroup(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 20px rgba(59,130,246,0.25)" }}
        >
          + 新建班组
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "班组总数", value: groups.length, color: "var(--accent)" },
          { label: "总成员数", value: groups.reduce((s, g) => s + g.members.length, 0), color: "#10b981" },
          { label: "可用工人", value: workers.length, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
            <div className="font-mono font-bold text-xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👷</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            还没有班组，点击上方按钮创建第一个班组
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="rounded-xl p-5 transition-all hover:scale-[1.01]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* 班组头部 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-white">{g.name}</div>
                  {g.description && (
                    <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{g.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingGroup(g); setShowForm(true); }}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--accent)" }}
                  >
                    编辑
                  </button>
                  {deleteConfirm === g.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(g.id)} className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "#ef4444" }}>
                        确认
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(g.id)}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>

              {/* 成员列表 */}
              <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
                成员（{g.members.length} 人）
              </div>
              {g.members.length === 0 ? (
                <div className="text-xs py-3 text-center rounded-lg" style={{ color: "var(--muted)", background: "rgba(0,0,0,0.2)" }}>
                  暂无成员，点击编辑添加
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--accent)" }}
                    >
                      <span className="font-medium">{m.worker.name}</span>
                      {m.role && (
                        <span style={{ color: "var(--muted)" }}>· {m.role}</span>
                      )}
                      {m.worker.project && (
                        <span style={{ color: "var(--muted)" }}>· {m.worker.project}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* 创建时间 */}
              <div className="text-[11px] mt-3" style={{ color: "var(--muted)" }}>
                创建于 {new Date(g.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      {showForm && (
        <GroupFormModal
          group={editingGroup}
          workers={workers}
          onClose={() => { setShowForm(false); setEditingGroup(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

// ─── 班组表单弹窗 ──────────────────────────────────────────────────────
function GroupFormModal({
  group,
  workers,
  onClose,
  onSaved,
}: {
  group: WorkerGroup | null;
  workers: Worker[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [selectedWorkers, setSelectedWorkers] = useState<
    { workerId: number; role: string }[]
  >(group?.members.map((m) => ({ workerId: m.workerId, role: m.role || "" })) || []);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filteredWorkers = workers.filter(
    (w) =>
      !selectedWorkers.some((s) => s.workerId === w.id) &&
      (w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.phone && w.phone.includes(search)))
  );

  const addWorker = (w: Worker) => {
    setSelectedWorkers((prev) => [...prev, { workerId: w.id, role: "" }]);
    setSearch("");
  };

  const removeWorker = (workerId: number) => {
    setSelectedWorkers((prev) => prev.filter((s) => s.workerId !== workerId));
  };

  const updateRole = (workerId: number, role: string) => {
    setSelectedWorkers((prev) =>
      prev.map((s) => (s.workerId === workerId ? { ...s, role } : s))
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setMsg("班组名称不能为空"); return; }
    setSubmitting(true);
    setMsg(null);

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        members: selectedWorkers.map((s) => ({ workerId: s.workerId, role: s.role || null })),
      };

      const res = isEdit
        ? await fetch(`/api/worker-groups/${group!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/worker-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, memberIds: body.members }),
          });

      const data = await res.json();
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        setMsg(data.error || "操作失败");
      }
    } catch {
      setMsg("网络错误");
    }
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? "编辑班组" : "新建班组"}</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>✕</button>
        </div>

        {/* 名称 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>班组名称</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="如：电缆敷设班组"
            className="w-full px-4 py-2.5 rounded-lg text-sm" maxLength={30}
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
          />
        </div>

        {/* 描述 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>描述（可选）</div>
          <input
            value={description} onChange={(e) => setDescription(e.target.value)} placeholder="班组简述"
            className="w-full px-4 py-2.5 rounded-lg text-sm" maxLength={100}
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
          />
        </div>

        {/* 已选工人 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
            已选成员（{selectedWorkers.length} 人）
          </div>
          {selectedWorkers.length === 0 ? (
            <div className="text-xs py-3 text-center rounded-lg" style={{ background: "rgba(0,0,0,0.2)", color: "var(--muted)" }}>
              搜索并添加工人
            </div>
          ) : (
            <div className="space-y-2">
              {selectedWorkers.map((s) => {
                const w = workers.find((wk) => wk.id === s.workerId);
                if (!w) return null;
                return (
                  <div
                    key={s.workerId}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}
                  >
                    <span className="text-sm text-white font-medium min-w-[60px]">{w.name}</span>
                    <input
                      value={s.role} onChange={(e) => updateRole(s.workerId, e.target.value)}
                      placeholder="分工（选填）" className="flex-1 px-3 py-1.5 rounded text-xs"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
                    />
                    <button onClick={() => removeWorker(s.workerId)} className="text-xs" style={{ color: "#f87171" }}>
                      移除
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 搜索添加工人 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>搜索工人</div>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="输入姓名或手机号搜索..."
            className="w-full px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
          />
          {search && filteredWorkers.length > 0 && (
            <div className="mt-1.5 rounded-lg max-h-40 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)" }}>
              {filteredWorkers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => addWorker(w)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-all hover:bg-white/5"
                  style={{ color: "white" }}
                >
                  <span>{w.name} <span style={{ color: "var(--muted)" }}>{w.phone}</span></span>
                  <span style={{ color: "var(--muted)" }}>{w.project || "-"}</span>
                </button>
              ))}
            </div>
          )}
          {search && filteredWorkers.length === 0 && (
            <div className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>未找到匹配的工人</div>
          )}
        </div>

        {/* 消息 */}
        {msg && (
          <div className="text-sm text-center" style={{ color: msg.includes("成功") ? "#10b981" : "#f87171" }}>{msg}</div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: submitting ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            {submitting ? "保存中..." : isEdit ? "保存修改" : "创建班组"}
          </button>
        </div>
      </div>
    </div>
  );
}
