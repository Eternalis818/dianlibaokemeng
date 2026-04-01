"use client";
import { useState, useEffect, useRef } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Report = { 工序: string; 规格: string; 数量: string };
type Phase = "login" | "checkin" | "chat" | "confirm" | "done";
type Worker = { id: string; name: string; project: string };

type ReportRecord = {
  id: number;
  task: string;
  spec: string;
  qty: string;
  status: string;
  createdAt: string;
  project: string;
};

type CorrectionTarget = {
  reportId: number;
  task: string;
  spec: string;
  qty: string;
};

// ─── Correction Modal ─────────────────────────────────────────────────────────
function CorrectionModal({
  target,
  worker,
  onClose,
}: {
  target: CorrectionTarget;
  worker: Worker;
  onClose: () => void;
}) {
  const [task, setTask] = useState(target.task);
  const [spec, setSpec] = useState(target.spec);
  const [qty, setQty] = useState(target.qty);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id,
          workerName: worker.name,
          original: `工序:${target.task} 规格:${target.spec} 数量:${target.qty}`,
          corrected: JSON.stringify({ task, spec, qty }),
          reason,
          reportId: target.reportId,
        }),
      });
      setDone(true);
    } catch {
      /* non-blocking */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-base font-semibold text-white mb-1">纠偏申请已提交</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted)" }}>等待负责人确认后生效</div>
            <button className="btn-ghost" onClick={onClose}>关闭</button>
          </div>
        ) : (
          <>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />
            <div className="text-base font-semibold text-white mb-4">申请纠偏</div>

            {[
              { label: "工序", value: task, set: setTask },
              { label: "规格", value: spec, set: setSpec },
              { label: "数量", value: qty, set: setQty },
            ].map(({ label, value, set }) => (
              <div key={label} className="mb-3">
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{label}</div>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
              </div>
            ))}

            <div className="mb-5">
              <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
                纠偏原因 <span style={{ color: "#ef4444" }}>*</span>
              </div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="说明原因，例如：录入时数量搞错了"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
              className="btn-primary w-full py-4 rounded-xl text-base mb-2 disabled:opacity-50"
            >
              {submitting ? "提交中..." : "提交纠偏申请"}
            </button>
            <button className="btn-ghost w-full py-3" onClick={onClose}>取消</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView({ worker, onClose }: { worker: Worker; onClose: () => void }) {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [corrTarget, setCorrTarget] = useState<CorrectionTarget | null>(null);

  useEffect(() => {
    fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [worker.id]);

  const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "待审", color: "var(--amber)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    approved: { label: "已批", color: "var(--green)", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
    rejected: { label: "驳回", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--bg)" }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl"
            style={{ background: "var(--bg)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <div className="text-sm font-semibold text-white">我的报量记录</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {worker.name} · {worker.project}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex gap-1.5 justify-center py-16">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm" style={{ color: "var(--muted)" }}>暂无报量记录</span>
            </div>
          ) : (
            records.map((r) => {
              const s = statusMap[r.status] ?? statusMap.pending;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      {fmtDate(r.createdAt)}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-2 p-3 rounded-xl text-xs"
                    style={{ background: "var(--bg)" }}
                  >
                    {([["工序", r.task], ["规格", r.spec], ["数量", r.qty]] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: "var(--muted)" }}>{k}</div>
                        <div className="font-medium text-white mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setCorrTarget({ reportId: r.id, task: r.task, spec: r.spec, qty: r.qty })}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        color: "var(--amber)",
                      }}
                    >
                      申请纠偏
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {corrTarget && (
        <CorrectionModal
          target={corrTarget}
          worker={worker}
          onClose={() => setCorrTarget(null)}
        />
      )}
    </>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (w: Worker) => void }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workers")
      .then((r) => r.json())
      .then((data) => { setWorkers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">选择你的身份</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>点击你的名字继续</p>
      </div>

      {loading ? (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-2">
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => onLogin(w)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-95"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                >
                  {w.name[0]}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{w.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{w.project}</div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Check-In Screen ──────────────────────────────────────────────────────────
type TodayStatus = {
  checkedIn: boolean;
  checkinTime?: string;
  reportCount: number;
  pendingCount: number;
  approvedCount: number;
};

function CheckInScreen({
  worker,
  onCheckIn,
  onViewHistory,
}: {
  worker: Worker;
  onCheckIn: () => void;
  onViewHistory: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      fetch("/api/checkin").then((r) => r.json()).catch(() => []),
      fetch(`/api/reports?workerId=${encodeURIComponent(worker.id)}`).then((r) => r.json()).catch(() => []),
    ]).then(([checkins, reports]) => {
      const myCheckin = Array.isArray(checkins)
        ? checkins.find(
            (ci: { workerId: string; createdAt: string }) =>
              ci.workerId === worker.id && new Date(ci.createdAt) >= todayStart
          )
        : null;
      const todayReports = Array.isArray(reports)
        ? reports.filter((r: { createdAt: string }) => new Date(r.createdAt) >= todayStart)
        : [];
      const d = myCheckin ? new Date(myCheckin.createdAt) : null;
      setTodayStatus({
        checkedIn: !!myCheckin,
        checkinTime: d
          ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
          : undefined,
        reportCount: todayReports.length,
        pendingCount: todayReports.filter((r: { status: string }) => r.status === "pending").length,
        approvedCount: todayReports.filter((r: { status: string }) => r.status === "approved").length,
      });
    });
  }, [worker.id]);

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, project: worker.project }),
      });
    } catch {
      /* non-blocking */
    }
    onCheckIn();
  };

  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{worker.name}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{worker.project} · {worker.id}</p>
      </div>

      {/* Today status banner */}
      {todayStatus && (
        <div
          className="w-full max-w-xs rounded-2xl px-4 py-3.5"
          style={
            todayStatus.checkedIn
              ? { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)" }
              : { background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }
          }
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: todayStatus.checkedIn ? "var(--green)" : "var(--muted)" }}
            />
            <span className="text-xs font-medium" style={{ color: todayStatus.checkedIn ? "var(--green)" : "var(--muted)" }}>
              {todayStatus.checkedIn ? `今天 ${todayStatus.checkinTime} 已打卡` : "今天尚未打卡"}
            </span>
          </div>
          {todayStatus.reportCount > 0 ? (
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              今日报量 {todayStatus.reportCount} 条
              {todayStatus.approvedCount > 0 && <span style={{ color: "var(--green)" }}> · {todayStatus.approvedCount} 条已批</span>}
              {todayStatus.pendingCount > 0 && <span style={{ color: "var(--amber)" }}> · {todayStatus.pendingCount} 条待审</span>}
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--muted)" }}>今日暂无报量记录</div>
          )}
        </div>
      )}

      <div
        className="flex items-center gap-3 px-5 py-3 rounded-xl w-full max-w-xs"
        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm" style={{ color: "var(--amber)" }}>
          GPS 模拟中 · 高德围栏接入后生效
        </span>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleCheckIn}
          disabled={checking}
          className="w-full py-5 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            boxShadow: "0 0 32px rgba(16,185,129,0.35)",
          }}
        >
          {checking ? "打卡中..." : "进场打卡"}
        </button>
        <button
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          查看历史记录
        </button>
      </div>
    </div>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────
function DoneScreen({
  worker,
  checkInTime,
  report,
  onReset,
  onViewHistory,
}: {
  worker: Worker;
  checkInTime: string;
  report: Report | null;
  onReset: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="min-h-[100dvh] grid-bg flex flex-col items-center justify-center gap-6 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">报量已提交</h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{worker.name} · 打卡时间 {checkInTime}</p>
      </div>
      {report && (
        <div className="glass rounded-2xl p-5 w-full max-w-sm">
          {(Object.entries(report) as [string, string][]).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between items-center py-2.5 border-b text-sm"
              style={{ borderColor: "rgba(59,130,246,0.08)" }}
            >
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span className="text-white font-medium">{v}</span>
            </div>
          ))}
        </div>
      )}
      <div className="w-full max-w-sm space-y-2.5">
        <button className="btn-ghost w-full py-3.5" onClick={onReset}>继续报量</button>
        <button
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          查看全部记录
        </button>
      </div>
    </div>
  );
}

// ─── Main Worker Page ─────────────────────────────────────────────────────────
export default function WorkerPage() {
  const [phase, setPhase] = useState<Phase>("login");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore identity from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pl_worker");
    if (saved) {
      try { setWorker(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Start conversation after check-in
  useEffect(() => {
    if (phase === "chat" && msgs.length === 0) {
      setMsgs([{ role: "assistant", content: "今天做了啥？" }]);
    }
  }, [phase]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, interimText, loading]);

  const handleLogin = (w: Worker) => {
    setWorker(w);
    localStorage.setItem("pl_worker", JSON.stringify(w));
    setPhase("checkin");
  };

  const doCheckIn = () => {
    const now = new Date();
    setCheckInTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setPhase("chat");
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const newMsgs: Msg[] = [...msgs, { role: "user", content: trimmed }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/worker/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      const aiContent: string = data.content ?? "好的，继续。";

      if (aiContent.includes("[DONE]")) {
        const jStart = aiContent.indexOf("{");
        const jEnd = aiContent.lastIndexOf("}") + 1;
        if (jStart !== -1 && jEnd > jStart) {
          try { setReport(JSON.parse(aiContent.slice(jStart, jEnd)) as Report); } catch { /* ignore */ }
        }
        const displayText = aiContent.split("[DONE]")[0].trim() || "好，记上了。";
        setMsgs([...newMsgs, { role: "assistant", content: displayText }]);
        setTimeout(() => setPhase("confirm"), 600);
      } else {
        setMsgs([...newMsgs, { role: "assistant", content: aiContent }]);
      }
    } catch {
      setMsgs([...newMsgs, { role: "assistant", content: "网络不好，再说一遍？" }]);
    } finally {
      setLoading(false);
    }
  };

  const startVoice = () => {
    const SR =
      typeof window !== "undefined" &&
      ((window as Window & { SpeechRecognition?: SpeechRecognitionStatic }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: SpeechRecognitionStatic }).webkitSpeechRecognition);
    if (!SR) {
      alert("当前浏览器不支持语音，请用下方文字输入（建议手机 Chrome）");
      return;
    }
    const r = new SR();
    r.lang = "zh-CN";
    r.continuous = false;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interim = Array.from(e.results).map((res: any) => res[0].transcript).join("");
      if (e.results[e.results.length - 1].isFinal) {
        setInterimText(""); sendMessage(interim);
      } else {
        setInterimText(interim);
      }
    };
    r.onerror = () => { setRecording(false); setInterimText(""); };
    r.onend = () => { setRecording(false); setInterimText(""); };
    r.start();
    setRecording(true);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.path) setPhotoPath(data.path);
    } catch { /* non-blocking */ } finally {
      setUploading(false);
    }
  };

  const submitReport = async () => {
    if (!report || !worker) return;
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id,
          workerName: worker.name,
          project: worker.project,
          task: report.工序,
          spec: report.规格,
          qty: report.数量,
          photoPath,
        }),
      });
    } catch { /* non-blocking */ }
    setPhase("done");
  };

  const resetAll = () => {
    setPhase("checkin");
    setMsgs([]);
    setInput("");
    setReport(null);
    setInterimText("");
    setPhotoPath(null);
  };

  // Show history overlay over any phase (except login)
  if (showHistory && worker) {
    return <HistoryView worker={worker} onClose={() => setShowHistory(false)} />;
  }

  if (phase === "login") return <LoginScreen onLogin={handleLogin} />;
  if (!worker) return null;
  if (phase === "checkin") return (
    <CheckInScreen worker={worker} onCheckIn={doCheckIn} onViewHistory={() => setShowHistory(true)} />
  );
  if (phase === "done") return (
    <DoneScreen
      worker={worker}
      checkInTime={checkInTime}
      report={report}
      onReset={resetAll}
      onViewHistory={() => setShowHistory(true)}
    />
  );

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <div className="font-semibold text-white text-sm">{worker.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {worker.project} · 打卡 {checkInTime}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            记录
          </button>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--amber)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--amber)" }} />
            模拟围栏
          </div>
          <button
            onClick={() => { localStorage.removeItem("pl_worker"); setPhase("login"); setWorker(null); }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ color: "var(--muted)", background: "var(--bg)" }}
          >
            切换
          </button>
        </div>
      </div>

      {/* Chat messages */}
      {phase === "chat" && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5"
                  style={{ background: "rgba(59,130,246,0.2)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
              )}
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--accent)", color: "white", borderBottomRightRadius: "4px" }
                    : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderBottomLeftRadius: "4px" }
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.2)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottomLeftRadius: "4px" }}>
                <span className="animate-pulse" style={{ color: "var(--muted)", letterSpacing: "4px" }}>···</span>
              </div>
            </div>
          )}

          {interimText && (
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm opacity-60" style={{ background: "var(--accent)", color: "white", borderBottomRightRadius: "4px" }}>
                {interimText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm phase */}
      {phase === "confirm" && report && (
        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-white text-base">确认本次报量</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>请核对信息后提交</p>
          </div>
          <div className="glass rounded-2xl p-5 mb-4">
            {(Object.entries(report) as [string, string][]).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center py-3 border-b text-sm"
                style={{ borderColor: "rgba(59,130,246,0.08)" }}
              >
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span className="text-white font-semibold">{v}</span>
              </div>
            ))}
          </div>

          {/* Photo upload */}
          <label
            className="flex items-center justify-center gap-2 py-4 rounded-xl mb-5 cursor-pointer text-sm transition-all"
            style={{
              border: photoPath ? "1px solid rgba(16,185,129,0.35)" : "1px dashed rgba(59,130,246,0.25)",
              color: photoPath ? "var(--green)" : "var(--muted)",
              background: photoPath ? "rgba(16,185,129,0.06)" : "transparent",
            }}
          >
            {uploading ? (
              <span className="animate-pulse">上传中...</span>
            ) : photoPath ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                照片已上传
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                拍照存证（选填）
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }}
            />
          </label>

          <button className="btn-primary w-full py-4 text-base rounded-xl mb-2" onClick={submitReport}>
            确认提交
          </button>
          <button
            className="btn-ghost w-full py-3"
            onClick={() => { setPhase("chat"); setReport(null); setPhotoPath(null); }}
          >
            重新填写
          </button>
        </div>
      )}

      {/* Input area — only in chat */}
      {phase === "chat" && (
        <div
          className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <button
            onClick={startVoice}
            disabled={recording || loading}
            className="w-full py-4 rounded-xl mb-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-98 disabled:opacity-60"
            style={{
              background: recording ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.1)",
              border: `1px solid ${recording ? "rgba(239,68,68,0.35)" : "rgba(59,130,246,0.25)"}`,
              color: recording ? "#ef4444" : "var(--accent)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {recording ? "聆听中... 请说话" : "点击语音输入"}
          </button>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="或直接文字输入..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              className="btn-primary px-4 py-2.5 rounded-xl text-sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              发
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// TypeScript stub for browser SpeechRecognition
interface SpeechRecognitionStatic {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (): any;
}
