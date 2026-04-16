"use client";
import { useState, useEffect, useCallback } from "react";

type TicketType = "feature" | "bug" | "other";
type TicketStatus = "pending" | "adopted" | "closed";

interface Ticket {
  id: number;
  type: TicketType;
  subject: string;
  content: string;
  screenshots: string[];
  status: TicketStatus;
  rewardDays: number | null;
  adminReply: string | null;
  source: string;
  bossId: number | null;
  contactInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_CONFIG: Record<TicketType, { label: string; color: string; bg: string }> = {
  feature: { label: "功能需求", color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
  bug:     { label: "Bug 报告", color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  other:   { label: "其他反馈", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: "待处理", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  adopted:  { label: "已采纳", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  closed:   { label: "已关闭", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

// ─── 提交反馈弹窗 ──────────────────────────────────────────────────────
function SubmitModal({ open, onClose, onSubmitted }: { open: boolean; onClose: () => void; onSubmitted: () => void }) {
  const [type, setType] = useState<TicketType>("feature");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) {
      setMsg("请填写标题和详细描述");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, content, contactInfo, source: "admin" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("提交成功！我们会尽快处理。");
        setSubject("");
        setContent("");
        setContactInfo("");
        onSubmitted();
        setTimeout(() => { setMsg(null); onClose(); }, 1500);
      } else {
        setMsg(data.error || "提交失败");
      }
    } catch {
      setMsg("网络错误");
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">提交反馈</h2>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--muted)" }}>✕</button>
        </div>

        {/* 类型选择 */}
        <div>
          <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>反馈类型</div>
          <div className="flex gap-2">
            {(Object.entries(TYPE_CONFIG) as [TicketType, typeof TYPE_CONFIG.feature][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setType(key)}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: type === key ? cfg.bg : "transparent",
                  border: `1px solid ${type === key ? cfg.color + "50" : "var(--border)"}`,
                  color: type === key ? cfg.color : "var(--muted)",
                }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* 标题 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>标题</div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="简要描述您的问题或需求"
            className="w-full px-4 py-2.5 rounded-lg text-sm" maxLength={100}
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        </div>

        {/* 详细描述 */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>详细描述</div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="请详细说明您遇到的问题或期望的功能..." rows={4}
            className="w-full px-4 py-2.5 rounded-lg text-sm resize-none"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        </div>

        {/* 联系方式（可选） */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>联系方式（选填，方便我们回复您）</div>
          <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="手机号 / 邮箱 / 微信"
            className="w-full px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        </div>

        {/* 提示 */}
        <div className="text-[11px] leading-relaxed p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "var(--accent)" }}>
          提交后将自动发送邮件通知客服团队。反馈一经采纳，可获得免费使用天数奖励！
        </div>

        {/* 消息 */}
        {msg && (
          <div className="text-sm text-center" style={{ color: msg.includes("成功") ? "#10b981" : "#f87171" }}>{msg}</div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>取消</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: submitting ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
            {submitting ? "提交中..." : "提交反馈"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 采纳操作面板 ──────────────────────────────────────────────────────
function AdoptPanel({ ticketId, onDone }: { ticketId: number; onDone: () => void }) {
  const [rewardDays, setRewardDays] = useState(7);
  const [adminReply, setAdminReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleAdopt = async () => {
    if (rewardDays <= 0) { setMsg("请输入有效天数"); return; }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/feedback/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "adopted", rewardDays, adminReply, contactEmail: "" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("采纳成功，奖励已发放！");
        setTimeout(() => onDone(), 1000);
      } else {
        setMsg(data.error || "操作失败");
      }
    } catch {
      setMsg("网络错误");
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-3 p-3 rounded-xl space-y-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <div className="flex items-center gap-3">
        <div className="text-xs" style={{ color: "var(--muted)" }}>奖励天数</div>
        <input type="number" value={rewardDays} onChange={(e) => setRewardDays(parseInt(e.target.value) || 0)} min={1} max={365}
          className="w-20 px-3 py-1.5 rounded-lg text-sm font-mono text-center"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        <span className="text-xs" style={{ color: "var(--muted)" }}>天</span>
      </div>
      <div>
        <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>管理员回复</div>
        <textarea value={adminReply} onChange={(e) => setAdminReply(e.target.value)} placeholder="感谢您的宝贵建议！" rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleAdopt} disabled={submitting}
          className="px-4 py-2 rounded-lg text-xs font-medium text-white"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
          {submitting ? "处理中..." : "确认发放奖励"}
        </button>
        {msg && <span className="text-xs" style={{ color: msg.includes("成功") ? "#10b981" : "#f87171" }}>{msg}</span>}
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "">("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [adoptingId, setAdoptingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback${filter ? `?status=${filter}` : ""}`);
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleClose = async (id: number) => {
    try {
      await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      fetchTickets();
    } catch { /* ignore */ }
  };

  const pendingCount = tickets.filter((t) => t.status === "pending").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">客服中心</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            收集用户反馈与需求，采纳后奖励免费使用天数
          </p>
        </div>
        <button onClick={() => setShowSubmit(true)}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 20px rgba(59,130,246,0.25)" }}>
          + 提交反馈
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "全部反馈", value: tickets.length, color: "var(--accent)" },
          { label: "待处理", value: pendingCount, color: "var(--amber)" },
          { label: "已采纳", value: tickets.filter((t) => t.status === "adopted").length, color: "#10b981" },
          { label: "已关闭", value: tickets.filter((t) => t.status === "closed").length, color: "#94a3b8" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
            <div className="font-mono font-bold text-xl" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["", "pending", "adopted", "closed"] as const).map((s) => (
          <button key={s} onClick={() => { setFilter(s); setLoading(true); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === s ? "var(--accent)" : "var(--surface)",
              color: filter === s ? "#fff" : "var(--muted)",
              border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
            }}>
            {s === "" ? "全部" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>
          暂无反馈记录
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const tc = TYPE_CONFIG[t.type];
            const sc = STATUS_CONFIG[t.status];
            return (
              <div key={t.id} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: tc.color, background: tc.bg }}>
                      {tc.label}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>#{t.id}</span>
                    {t.source === "boss" && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}>
                        老板端
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: sc.color, background: sc.bg }}>
                    {sc.label}
                  </span>
                </div>

                {/* Subject */}
                <div className="text-sm font-semibold text-white mb-2">{t.subject}</div>

                {/* Content */}
                <div className="text-sm leading-relaxed mb-3" style={{ color: "var(--muted)" }}>{t.content}</div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--muted)" }}>
                  <span>{new Date(t.createdAt).toLocaleString("zh-CN")}</span>
                  {t.contactInfo && <span>联系：{t.contactInfo}</span>}
                </div>

                {/* 已采纳信息 */}
                {t.status === "adopted" && t.rewardDays && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#10b981" }}>+{t.rewardDays} 天</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>奖励已发放</span>
                    </div>
                    {t.adminReply && (
                      <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>回复：{t.adminReply}</div>
                    )}
                  </div>
                )}

                {/* 操作按钮（仅待处理状态） */}
                {t.status === "pending" && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setAdoptingId(adoptingId === t.id ? null : t.id)}
                      className="px-4 py-2 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                      {adoptingId === t.id ? "取消" : "采纳并奖励"}
                    </button>
                    <button onClick={() => handleClose(t.id)}
                      className="px-4 py-2 rounded-lg text-xs"
                      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>
                      关闭
                    </button>
                  </div>
                )}

                {/* 采纳面板 */}
                {adoptingId === t.id && (
                  <AdoptPanel ticketId={t.id} onDone={() => { setAdoptingId(null); fetchTickets(); }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <SubmitModal open={showSubmit} onClose={() => setShowSubmit(false)} onSubmitted={fetchTickets} />
    </div>
  );
}
