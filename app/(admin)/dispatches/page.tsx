"use client";
import { useState, useEffect, useCallback } from "react";

// ─── 类型 ──────────────────────────────────────────────────────────────
type DispatchStatus = "draft" | "sent" | "done";

interface WorkerBrief {
  id: number;
  name: string;
  phone: string;
  project: string | null;
}

interface DispatchWorker {
  id: number;
  workerId: number;
  role: string | null;
  worker: WorkerBrief;
}

interface WorkerGroup {
  id: number;
  name: string;
  members: { workerId: number; worker: WorkerBrief; role: string | null }[];
}

interface Dispatch {
  id: number;
  projectCode: string | null;
  location: string | null;
  content: string;
  startTime: string | null;
  endTime: string | null;
  photoPath: string | null;
  status: DispatchStatus;
  createdAt: string;
  workers: DispatchWorker[];
}

const STATUS_CFG: Record<DispatchStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "草稿", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  sent: { label: "已发送", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  done: { label: "已完成", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
};

function fmtDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── 主页面 ────────────────────────────────────────────────────────────
export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [workers, setWorkers] = useState<WorkerBrief[]>([]);
  const [groups, setGroups] = useState<WorkerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DispatchStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<Dispatch | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, wRes, gRes] = await Promise.all([
        fetch(`/api/dispatches${filter ? `?status=${filter}` : ""}`),
        fetch("/api/workers"),
        fetch("/api/worker-groups"),
      ]);
      const dData = await dRes.json();
      const wData = await wRes.json();
      const gData = await gRes.json();
      if (Array.isArray(dData)) setDispatches(dData);
      if (Array.isArray(wData)) setWorkers(wData);
      if (Array.isArray(gData)) setGroups(gData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此草稿？")) return;
    try {
      const res = await fetch(`/api/dispatches/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) setDispatches((prev) => prev.filter((d) => d.id !== id));
    } catch { /* ignore */ }
  };

  const handleSend = async (id: number) => {
    if (!confirm("确认发送？发送后将通知所有关联工人。")) return;
    try {
      const res = await fetch(`/api/dispatches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
  };

  const stats = {
    total: dispatches.length,
    draft: dispatches.filter((d) => d.status === "draft").length,
    sent: dispatches.filter((d) => d.status === "sent").length,
    done: dispatches.filter((d) => d.status === "done").length,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">派工单</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            创建派工单、AI识别工作票、群发通知工人
          </p>
        </div>
        <button
          onClick={() => { setEditingDispatch(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 20px rgba(59,130,246,0.25)" }}
        >
          + 新建派工
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "全部", value: stats.total, color: "var(--accent)" },
          { label: "草稿", value: stats.draft, color: "#94a3b8" },
          { label: "已发送", value: stats.sent, color: "#3b82f6" },
          { label: "已完成", value: stats.done, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
            <div className="font-mono font-bold text-xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["", "draft", "sent", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setLoading(true); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === s ? "var(--accent)" : "var(--surface)",
              color: filter === s ? "#fff" : "var(--muted)",
              border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {s === "" ? "全部" : STATUS_CFG[s].label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : dispatches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>暂无派工单</div>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((d) => {
            const sc = STATUS_CFG[d.status];
            return (
              <div
                key={d.id}
                className="rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.005]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onClick={() => setDetailId(detailId === d.id ? null : d.id)}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>#{d.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: sc.color, background: sc.bg }}>
                      {sc.label}
                    </span>
                    {d.projectCode && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}>
                        {d.projectCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === "draft" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingDispatch(d); setShowForm(true); }}
                          className="px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--accent)" }}
                        >
                          编辑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSend(d.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                        >
                          发送
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm text-white mb-2 line-clamp-2">{d.content}</div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
                  {d.location && <span>📍 {d.location}</span>}
                  <span>🕐 {fmtDate(d.startTime)} ~ {fmtDate(d.endTime)}</span>
                  <span>👥 {d.workers.length} 人</span>
                </div>

                {/* Detail expand */}
                {detailId === d.id && (
                  <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                    {/* Workers */}
                    <div>
                      <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>派工人员</div>
                      {d.workers.length === 0 ? (
                        <div className="text-xs" style={{ color: "var(--muted)" }}>未分配工人</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {d.workers.map((dw) => (
                            <span
                              key={dw.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--accent)" }}
                            >
                              {dw.worker.name}
                              {dw.role && <span style={{ color: "var(--muted)" }}>· {dw.role}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Photo */}
                    {d.photoPath && (
                      <div>
                        <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>工作票照片</div>
                        <img
                          src={d.photoPath}
                          alt="工作票"
                          className="max-w-xs rounded-lg"
                          style={{ border: "1px solid var(--border)" }}
                        />
                      </div>
                    )}

                    {/* Time */}
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      创建于 {new Date(d.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      {showForm && (
        <DispatchFormModal
          dispatch={editingDispatch}
          workers={workers}
          groups={groups}
          onClose={() => { setShowForm(false); setEditingDispatch(null); }}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}

// ─── 派工单表单弹窗 ────────────────────────────────────────────────────
function DispatchFormModal({
  dispatch,
  workers,
  groups,
  onClose,
  onSaved,
}: {
  dispatch: Dispatch | null;
  workers: WorkerBrief[];
  groups: WorkerGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!dispatch;
  const [projectCode, setProjectCode] = useState(dispatch?.projectCode || "");
  const [location, setLocation] = useState(dispatch?.location || "");
  const [content, setContent] = useState(dispatch?.content || "");
  const [startTime, setStartTime] = useState(
    dispatch?.startTime ? new Date(dispatch.startTime).toISOString().slice(0, 16) : ""
  );
  const [endTime, setEndTime] = useState(
    dispatch?.endTime ? new Date(dispatch.endTime).toISOString().slice(0, 16) : ""
  );
  const [selectedWorkers, setSelectedWorkers] = useState<
    { workerId: number; role: string }[]
  >(dispatch?.workers.map((w) => ({ workerId: w.workerId, role: w.role || "" })) || []);
  const [search, setSearch] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(dispatch?.photoPath || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filteredWorkers = workers.filter(
    (w) =>
      !selectedWorkers.some((s) => s.workerId === w.id) &&
      (w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.phone && w.phone.includes(search)))
  );

  const addWorker = (w: WorkerBrief) => {
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

  // 导入整组
  const importGroup = (group: WorkerGroup) => {
    const newIds = new Set(selectedWorkers.map((s) => s.workerId));
    const additions = group.members
      .filter((m) => !newIds.has(m.workerId))
      .map((m) => ({ workerId: m.workerId, role: m.role || "" }));
    setSelectedWorkers((prev) => [...prev, ...additions]);
  };

  // AI照片识别
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 先上传文件
    const formData = new FormData();
    formData.append("file", file);
    try {
      const upRes = await fetch("/api/upload", { method: "POST", body: formData });
      const upData = await upRes.json();
      if (!upData.path) { setMsg("照片上传失败"); return; }
      setPhotoPath(upData.path);

      // AI识别
      setAnalyzing(true);
      setMsg("AI 正在识别工作票...");
      const aiRes = await fetch("/api/dispatches/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: upData.path }),
      });
      const aiData = await aiRes.json();
      if (aiData.success) {
        const d = aiData.data;
        if (d.projectCode) setProjectCode(d.projectCode);
        if (d.location) setLocation(d.location);
        if (d.content) setContent(d.content);
        if (d.startTime) setStartTime(new Date(d.startTime).toISOString().slice(0, 16));
        if (d.endTime) setEndTime(new Date(d.endTime).toISOString().slice(0, 16));
        setMsg("AI 识别完成！请检查并修正信息");
      } else {
        setMsg(aiData.error || "AI 识别失败，请手动填写");
      }
    } catch {
      setMsg("网络错误");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async (sendNow: boolean) => {
    if (!content.trim()) { setMsg("派工内容不能为空"); return; }
    setSubmitting(true);
    setMsg(null);

    try {
      const body = {
        projectCode: projectCode.trim() || null,
        location: location.trim() || null,
        content: content.trim(),
        startTime: startTime || null,
        endTime: endTime || null,
        photoPath,
        status: sendNow ? "sent" : "draft",
        workers: selectedWorkers.map((s) => ({ workerId: s.workerId, role: s.role || null })),
      };

      const res = isEdit
        ? await fetch(`/api/dispatches/${dispatch!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/dispatches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (res.ok || res.status === 201) {
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
          <h2 className="text-lg font-bold text-white">{isEdit ? "编辑派工单" : "新建派工单"}</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>✕</button>
        </div>

        {/* AI 工作票识别 */}
        {!isEdit && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium" style={{ color: "#a78bfa" }}>AI 工作票识别</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                  拍照或上传工作票，AI自动填写派工信息
                </div>
              </div>
              <label className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#a78bfa" }}>
                {analyzing ? "识别中..." : "上传照片"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={analyzing} />
              </label>
            </div>
            {photoPath && (
              <img src={photoPath} alt="工作票" className="mt-2 max-h-32 rounded-lg" style={{ border: "1px solid var(--border)" }} />
            )}
          </div>
        )}

        {/* 项目编码 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>项目编码</div>
            <input
              value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="如 HL-2024-001"
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>施工地点</div>
            <input
              value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如 xx变电站xx线路"
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
        </div>

        {/* 时间 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>开始时间</div>
            <input
              type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>结束时间</div>
            <input
              type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
            />
          </div>
        </div>

        {/* 派工内容 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>派工内容</div>
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述施工内容、安全注意事项..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg text-sm resize-none"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
          />
        </div>

        {/* 快速导入班组 */}
        {groups.length > 0 && (
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>快速导入班组</div>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => importGroup(g)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}
                >
                  {g.name}（{g.members.length}人）
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 已选工人 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
            派工人员（{selectedWorkers.length} 人）
          </div>
          {selectedWorkers.length > 0 && (
            <div className="space-y-2 mb-3">
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

          {/* 搜索添加 */}
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索工人姓名或手机号..."
            className="w-full px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}
          />
          {search && filteredWorkers.length > 0 && (
            <div className="mt-1.5 rounded-lg max-h-32 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)" }}>
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
        </div>

        {/* 消息 */}
        {msg && (
          <div className="text-sm text-center" style={{ color: msg.includes("成功") || msg.includes("识别完成") ? "#10b981" : msg.includes("失败") || msg.includes("错误") ? "#f87171" : "var(--accent)" }}>
            {msg}
          </div>
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
            onClick={() => handleSubmit(false)} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            保存草稿
          </button>
          <button
            onClick={() => handleSubmit(true)} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: submitting ? "rgba(16,185,129,0.4)" : "linear-gradient(135deg, #10b981, #059669)" }}
          >
            {submitting ? "提交中..." : "保存并发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
