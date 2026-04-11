"use client";
import { useState, useEffect, useCallback } from "react";
import BossLogin from "./components/BossLogin";
import AccountingTab from "./components/AccountingTab";
import QuantitiesTab from "./components/QuantitiesTab";
import SubscribeSheet from "./components/SubscribeSheet";

type Tab = "board" | "work" | "visas" | "accounting" | "quantities";
type Status = "pending" | "approved" | "rejected";

interface BossProfile {
  id: number;
  name: string;
  phone: string;
  project: string | null;
  role: string;
}

interface CheckIn {
  id: number;
  workerId: string;
  project: string;
  createdAt: string;
  worker: { id: string; name: string; project: string };
}

interface Report {
  id: number;
  workerName: string;
  project: string;
  task: string;
  spec: string;
  qty: string;
  photoPath?: string | null;
  status: Status;
  createdAt: string;
}

interface Visa {
  id: number;
  serialNo?: string | null;
  type: string;
  title: string;
  amount: number;
  submitter: string;
  project: string;
  projectCode?: string | null;
  reason?: string | null;
  daysExtended?: number | null;
  status: Status;
  createdAt: string;
}

interface Correction {
  id: number;
  workerName: string;
  original: string;
  corrected: string;
  reason: string;
  status: Status;
  createdAt: string;
}

interface WorkerRecord {
  id: string;
  name: string;
  project: string;
}

const EXPENSE_CATEGORIES = ["工资", "材料费", "房租", "水电", "挂靠费", "茶水费", "其他"] as const;

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const map = {
    pending: { label: "待审", color: "var(--amber)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    approved: { label: "已批", color: "var(--green)", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
    rejected: { label: "驳回", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  };
  const s = map[status];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const isQuantity = type === "quantity";
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
      style={isQuantity
        ? { color: "#60a5fa", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }
        : { color: "#c084fc", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }
      }
    >
      {isQuantity ? "工程量" : "工期"}
    </span>
  );
}

// ─── Board Tab ─────────────────────────────────────────────────────────────────
function BoardTab({
  checkIns,
  reports,
  visas,
  corrections,
  workers,
}: {
  checkIns: CheckIn[];
  reports: Report[];
  visas: Visa[];
  corrections: Correction[];
  workers: WorkerRecord[];
}) {
  const pendingReports = reports.filter((r) => r.status === "pending").length;
  const pendingVisas = visas.filter((v) => v.status === "pending").length;
  const pendingCorrections = corrections.filter((c) => c.status === "pending").length;
  const checkedInIds = new Set(checkIns.map((ci) => ci.workerId));
  const absentWorkers = workers.filter((w) => !checkedInIds.has(w.id));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "今日在场", value: checkIns.length, unit: "人", color: "var(--green)" },
          { label: "今日报量", value: reports.length, unit: "条", color: "var(--accent)" },
          { label: "待审报量", value: pendingReports, unit: "条", color: "var(--amber)" },
          { label: "待审签证", value: pendingVisas, unit: "笔", color: "#f472b6" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
            <div className="font-mono font-bold text-xl" style={{ color: s.color }}>
              {s.value}
              <span className="text-sm font-normal ml-0.5" style={{ color: "var(--muted)" }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pending alerts */}
      {(pendingReports > 0 || pendingVisas > 0 || pendingCorrections > 0) && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--amber)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            待处理事项
          </div>
          {pendingReports > 0 && (
            <div className="text-sm" style={{ color: "var(--text)" }}>· {pendingReports} 条工人报量待审核</div>
          )}
          {pendingVisas > 0 && (
            <div className="text-sm" style={{ color: "var(--text)" }}>· {pendingVisas} 笔签证待批复</div>
          )}
          {pendingCorrections > 0 && (
            <div className="text-sm" style={{ color: "var(--text)" }}>· {pendingCorrections} 条纠偏申请待确认</div>
          )}
        </div>
      )}

      {/* Workers on site */}
      <div>
        <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>今日在场工人</div>
        {checkIns.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-sm" style={{ color: "var(--muted)" }}>暂无工人打卡记录</span>
          </div>
        ) : (
          <div className="space-y-2">
            {checkIns.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}
                  >
                    {ci.worker.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{ci.worker.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{ci.project}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--green)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
                  {fmtTime(ci.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Absent workers */}
      {absentWorkers.length > 0 && (
        <div>
          <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>
            未打卡 · {absentWorkers.length} 人
          </div>
          <div className="space-y-2">
            {absentWorkers.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.55 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(100,116,139,0.15)", color: "var(--muted)" }}
                  >
                    {w.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{w.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{w.project}</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)" }}>
                  未到场
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({
  reports,
  onApprove,
  onReject,
}: {
  reports: Report[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const pending = reports.filter((r) => r.status === "pending");
  const done = reports.filter((r) => r.status !== "pending");

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {pending.length > 0 && (
        <div>
          <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>
            待审核 · {pending.length} 条
          </div>
          <div className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl p-4"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{r.workerName}</span>
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{fmtTime(r.createdAt)}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{r.project}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div
                  className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3 text-xs"
                  style={{ background: "var(--bg)" }}
                >
                  {[["工序", r.task], ["规格", r.spec], ["数量", r.qty]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: "var(--muted)" }}>{k}</div>
                      <div className="font-medium text-white mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
                {r.photoPath && (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.photoPath}
                      alt="现场照片"
                      className="w-full h-32 object-cover rounded-xl"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(r.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      color: "var(--green)",
                    }}
                  >
                    批准
                  </button>
                  <button
                    onClick={() => onReject(r.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444",
                    }}
                  >
                    驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>已处理 · {done.length} 条</div>
          <div className="space-y-2">
            {done.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.7 }}
              >
                <div>
                  <div className="text-sm text-white">
                    {r.workerName} · {r.task} · {r.qty}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{r.spec}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div style={{ color: "var(--muted)" }} className="text-sm">暂无报量记录</div>
        </div>
      )}
    </div>
  );
}

// ─── Visa Card (pending action) ────────────────────────────────────────────────
function VisaActionCard({
  visa,
  onApprove,
  onReject,
}: {
  visa: Visa;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.2)" }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={visa.type} />
            {visa.serialNo && (
              <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{visa.serialNo}</span>
            )}
          </div>
          <div className="text-sm font-medium text-white leading-snug">{visa.title}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {visa.submitter} · {fmtDate(visa.createdAt)}
          </div>
          {visa.reason && (
            <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>
              {visa.reason}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {visa.type === "quantity" ? (
            <div className="font-mono font-bold text-base" style={{ color: "var(--amber)" }}>
              ¥{visa.amount.toLocaleString()}
            </div>
          ) : (
            <div className="font-mono font-bold text-base" style={{ color: "#c084fc" }}>
              +{visa.daysExtended ?? 0}天
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onApprove(visa.id)}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}
        >
          批复
        </button>
        <button
          onClick={() => onReject(visa.id)}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
        >
          驳回
        </button>
      </div>
    </div>
  );
}

// ─── PnL Card ──────────────────────────────────────────────────────────────────
interface PnlData {
  projects: { project: string; reportValue: number; visaAmount: number; expense: number; revenue: number; pnl: number; pnlPercent: number }[];
  totals: { reportValue: number; visaAmount: number; expense: number; revenue: number; pnl: number; pnlPercent: number };
}

function PnlCard({ data }: { data: PnlData }) {
  const { totals } = data;
  const isProfit = totals.pnl >= 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>项目盈亏总览</div>
      {/* 总盈亏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white">{isProfit ? "总盈余" : "总亏损"}</span>
        <span className="font-mono font-bold text-2xl" style={{ color: isProfit ? "var(--green)" : "#f87171" }}>
          {isProfit ? "+" : ""}¥{totals.pnl.toLocaleString()}
        </span>
      </div>
      {/* 明细条 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl py-2" style={{ background: "rgba(59,130,246,0.08)" }}>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>产值</div>
          <div className="font-mono text-sm font-bold" style={{ color: "var(--accent)" }}>¥{totals.reportValue.toLocaleString()}</div>
        </div>
        <div className="rounded-xl py-2" style={{ background: "rgba(245,158,11,0.08)" }}>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>签证</div>
          <div className="font-mono text-sm font-bold" style={{ color: "var(--amber)" }}>¥{totals.visaAmount.toLocaleString()}</div>
        </div>
        <div className="rounded-xl py-2" style={{ background: "rgba(239,68,68,0.08)" }}>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>支出</div>
          <div className="font-mono text-sm font-bold" style={{ color: "#f87171" }}>¥{totals.expense.toLocaleString()}</div>
        </div>
      </div>
      {/* 各项目盈亏 */}
      {data.projects.length > 1 && (
        <div className="space-y-1.5">
          {data.projects.map((p) => (
            <div key={p.project} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "var(--bg)" }}>
              <span className="text-xs text-white truncate flex-1">{p.project}</span>
              <span className="font-mono text-xs font-bold shrink-0 ml-2" style={{ color: p.pnl >= 0 ? "var(--green)" : "#f87171" }}>
                {p.pnl >= 0 ? "+" : ""}¥{p.pnl.toLocaleString()}
                <span className="font-normal" style={{ color: "var(--muted)" }}> ({p.pnlPercent}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visas Tab ─────────────────────────────────────────────────────────────────
function VisasTab({
  visas,
  pnlData,
  onApprove,
  onReject,
}: {
  visas: Visa[];
  pnlData: PnlData | null;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const [filterProject, setFilterProject] = useState<string>("all");

  const projects = Array.from(new Set(visas.map((v) => v.project))).sort();
  const filtered = filterProject === "all" ? visas : visas.filter((v) => v.project === filterProject);

  // Group by project
  const grouped = filtered.reduce<Record<string, Visa[]>>((acc, v) => {
    if (!acc[v.project]) acc[v.project] = [];
    acc[v.project].push(v);
    return acc;
  }, {});

  const allPending = filtered.filter((v) => v.status === "pending");
  const pendingTotal = allPending.reduce((s, v) => s + v.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* 盈亏卡片 */}
      {pnlData && <PnlCard data={pnlData} />}

      {/* Project filter pills */}
      {projects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {["all", ...projects].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProject(p)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={filterProject === p
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {p === "all" ? "全部项目" : p}
            </button>
          ))}
        </div>
      )}

      {/* Pending summary bar */}
      {allPending.length > 0 && (
        <div
          className="rounded-2xl px-4 py-3 flex justify-between items-center"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}
        >
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            待批复 {allPending.length} 笔
          </span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--accent)" }}>
            ¥{pendingTotal.toLocaleString()}
          </span>
        </div>
      )}

      {/* Grouped by project */}
      {Object.entries(grouped).map(([project, projectVisas]) => {
        const pendingInProject = projectVisas.filter((v) => v.status === "pending");
        const doneInProject = projectVisas.filter((v) => v.status !== "pending");

        return (
          <div key={project}>
            {/* Project header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold tracking-wide" style={{ color: "var(--muted)" }}>
                {project}
              </div>
              {pendingInProject.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono"
                  style={{ background: "rgba(245,158,11,0.1)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  {pendingInProject.length} 待批
                </span>
              )}
            </div>

            {/* Pending visas with action buttons */}
            {pendingInProject.length > 0 && (
              <div className="space-y-3 mb-3">
                {pendingInProject.map((v) => (
                  <VisaActionCard key={v.id} visa={v} onApprove={onApprove} onReject={onReject} />
                ))}
              </div>
            )}

            {/* Done visas (compact) */}
            {doneInProject.length > 0 && (
              <div className="space-y-2">
                {doneInProject.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.7 }}
                  >
                    <div className="flex items-center gap-2 flex-1 pr-3 min-w-0">
                      <TypeBadge type={v.type} />
                      <span className="text-sm text-white truncate">{v.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {v.type === "quantity" ? `¥${v.amount.toLocaleString()}` : `+${v.daysExtended ?? 0}天`}
                      </span>
                      <StatusBadge status={v.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm" style={{ color: "var(--muted)" }}>暂无签证记录</span>
        </div>
      )}
    </div>
  );
}

// ─── Parse corrected field (JSON or plain text) ────────────────────────────────
function parseCorrected(corrected: string): { isJson: boolean; task?: string; spec?: string; qty?: string; plain: string } {
  try {
    const p = JSON.parse(corrected) as { task?: string; spec?: string; qty?: string };
    const parts: string[] = [];
    if (p.task) parts.push(p.task);
    if (p.spec) parts.push(p.spec);
    if (p.qty) parts.push(p.qty);
    return { isJson: true, task: p.task, spec: p.spec, qty: p.qty, plain: parts.join(" · ") };
  } catch {
    return { isJson: false, plain: corrected };
  }
}

// ─── Corrections Tab ───────────────────────────────────────────────────────────
function CorrectionsTab({
  corrections,
  onApprove,
  onReject,
}: {
  corrections: Correction[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const pending = corrections.filter((c) => c.status === "pending");
  const done = corrections.filter((c) => c.status !== "pending");

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {pending.length > 0 && (
        <div>
          <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>
            待确认 · {pending.length} 条
          </div>
          <div className="space-y-3">
            {pending.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl p-4"
                style={{ background: "var(--surface)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">{c.workerName} 申请纠偏</span>
                  <StatusBadge status={c.status} />
                </div>
                {(() => {
                  const parsed = parseCorrected(c.corrected);
                  return (
                    <div className="space-y-2 mb-3">
                      <div
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                      >
                        <span style={{ color: "#ef4444" }} className="shrink-0">原</span>
                        <span className="text-white">{c.original}</span>
                      </div>
                      <div className="flex justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                          <path d="M12 5v14M19 12l-7 7-7-7" />
                        </svg>
                      </div>
                      {parsed.isJson ? (
                        <div
                          className="grid grid-cols-3 gap-2 p-3 rounded-lg text-xs"
                          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
                        >
                          {([["工序", parsed.task], ["规格", parsed.spec], ["数量", parsed.qty]] as [string, string | undefined][])
                            .filter(([, v]) => v)
                            .map(([k, v]) => (
                              <div key={k}>
                                <div style={{ color: "var(--green)" }}>{k}</div>
                                <div className="font-medium text-white mt-0.5">{v}</div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
                          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}
                        >
                          <span style={{ color: "var(--green)" }} className="shrink-0">改</span>
                          <span className="text-white">{parsed.plain}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="text-xs mb-3 px-1" style={{ color: "var(--muted)" }}>
                  理由：{c.reason}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(c.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      color: "var(--green)",
                    }}
                  >
                    确认纠偏
                  </button>
                  <button
                    onClick={() => onReject(c.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444",
                    }}
                  >
                    不同意
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div className="text-xs mb-3 font-medium" style={{ color: "var(--muted)" }}>已处理 · {done.length} 条</div>
          <div className="space-y-2">
            {done.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.7 }}
              >
                <div>
                  <div className="text-sm text-white">{c.workerName} · {parseCorrected(c.corrected).plain}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{c.reason}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm" style={{ color: "var(--muted)" }}>暂无纠偏申请</span>
        </div>
      )}
    </div>
  );
}

// ─── Agent Summary Panel ───────────────────────────────────────────────────────
function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const generate = async () => {
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch("/api/boss/summary", { method: "POST" });
      const data = await res.json();
      setSummary(data.content ?? "无法生成汇总，请稍后重试。");
    } catch {
      setSummary("网络不好，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "var(--border)" }} />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Agent 今日汇总</span>
          </div>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.1)", color: "var(--amber)" }}
          >
            AI 生成
          </span>
        </div>

        {!summary && !loading && (
          <button
            onClick={generate}
            className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-98"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 0 24px rgba(59,130,246,0.3)",
            }}
          >
            一键生成今日工地汇总
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-sm" style={{ color: "var(--muted)" }}>AI 正在汇总今日数据...</span>
          </div>
        )}

        {summary && (
          <div
            className="rounded-2xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            {summary}
            <button
              onClick={generate}
              className="mt-3 text-xs block"
              style={{ color: "var(--accent)" }}
            >
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Bar config ────────────────────────────────────────────────────────────
const TABS: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  badge?: (r: Report[], v: Visa[], c: Correction[]) => number;
}[] = [
  {
    id: "board",
    label: "看板",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "work",
    label: "施工",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    badge: (r, _v, c) => r.filter((x) => x.status === "pending").length + c.filter((x) => x.status === "pending").length,
  },
  {
    id: "visas",
    label: "签证",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    badge: (_r, v) => v.filter((x) => x.status === "pending").length,
  },
  {
    id: "accounting",
    label: "记账",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "quantities",
    label: "量价",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

// ─── Main Boss Page ────────────────────────────────────────────────────────────
export default function BossPage() {
  const [boss, setBoss] = useState<BossProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [reports, setReports] = useState<Report[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [pnlData, setPnlData] = useState<PnlData | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [subscription, setSubscription] = useState<{
    status: string; isActive: boolean; daysRemaining: number | null;
    plan: { code: string; name: string; aiQuota: number };
    ai: { used: number; limit: number; remaining: number };
  } | null>(null);

  // 恢复会话
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("boss_auth");
      if (cached) setBoss(JSON.parse(cached));
    } catch { /* ignore */ }
    setAuthChecking(false);
  }, []);

  const handleLogin = (b: BossProfile) => setBoss(b);

  const handleLogout = async () => {
    sessionStorage.removeItem("boss_auth");
    await fetch("/api/boss/auth", { method: "DELETE" }).catch(() => {});
    setBoss(null);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [r, v, c, ci, w, pnl, subRes] = await Promise.all([
        fetch("/api/reports").then((res) => res.json()),
        fetch("/api/visas").then((res) => res.json()),
        fetch("/api/corrections").then((res) => res.json()),
        fetch("/api/checkin").then((res) => res.json()),
        fetch("/api/workers").then((res) => res.json()),
        fetch("/api/boss/visa-pnl").then((res) => res.json()),
        fetch("/api/boss/subscription").then((res) => res.json()),
      ]);
      setReports(Array.isArray(r) ? r : []);
      setVisas(Array.isArray(v) ? v : []);
      setCorrections(Array.isArray(c) ? c : []);
      setCheckIns(Array.isArray(ci) ? ci : []);
      setWorkers(Array.isArray(w) ? w : []);
      if (pnl && pnl.totals) setPnlData(pnl);
      if (subRes && subRes.subscription) setSubscription(subRes.subscription);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Boss page fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const updateReport = async (id: number, status: Status) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchAll();
    }
  };

  const updateVisa = async (id: number, status: Status) => {
    setVisas((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    try {
      await fetch(`/api/visas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchAll();
    }
  };

  const updateCorrection = async (id: number, status: Status) => {
    setCorrections((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await fetch(`/api/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchAll();
    }
  };

  const totalPending =
    reports.filter((r) => r.status === "pending").length +
    visas.filter((v) => v.status === "pending").length +
    corrections.filter((c) => c.status === "pending").length;

  if (authChecking) return null;
  if (!boss) return <BossLogin onLogin={handleLogin} />;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div>
          <div className="font-semibold text-white text-sm">{boss.name}</div>
          <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            {boss.project ?? "全部项目"} · {boss.role}
            {lastUpdated && (
              <span className="font-mono">
                · {lastUpdated.getHours().toString().padStart(2, "0")}:{lastUpdated.getMinutes().toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 订阅状态徽章 */}
          {subscription && (
            <div
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer active:scale-95 transition-all"
              onClick={() => setSubOpen(true)}
              style={{
                background: subscription.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: subscription.isActive ? "var(--green)" : "#f87171",
                border: `1px solid ${subscription.isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: subscription.isActive ? "var(--green)" : "#f87171" }} />
              {subscription.plan.name}
              {subscription.daysRemaining !== null && (
                <span className="font-mono opacity-70">{subscription.daysRemaining}天</span>
              )}
            </div>
          )}
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          )}
          {!loading && totalPending > 0 && (
            <div
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(245,158,11,0.12)", color: "var(--amber)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--amber)" }} />
              {totalPending} 待处理
            </div>
          )}
          <button
            onClick={() => setAgentOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "board" && (
          <BoardTab checkIns={checkIns} reports={reports} visas={visas} corrections={corrections} workers={workers} />
        )}
        {tab === "work" && (
          <>
            <ReportsTab reports={reports} onApprove={(id) => updateReport(id, "approved")} onReject={(id) => updateReport(id, "rejected")} />
            {corrections.filter((c) => c.status === "pending").length > 0 && (
              <CorrectionsTab corrections={corrections} onApprove={(id) => updateCorrection(id, "approved")} onReject={(id) => updateCorrection(id, "rejected")} />
            )}
          </>
        )}
        {tab === "visas" && (
          <VisasTab visas={visas} pnlData={pnlData} onApprove={(id) => updateVisa(id, "approved")} onReject={(id) => updateVisa(id, "rejected")} />
        )}
        {tab === "accounting" && <AccountingTab />}
        {tab === "quantities" && <QuantitiesTab />}
      </div>

      {/* Tab Bar */}
      <div
        className="shrink-0 border-t grid grid-cols-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {TABS.map((t) => {
          const badge = t.badge ? t.badge(reports, visas, corrections) : 0;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
              style={{ color: active ? "var(--accent)" : "var(--muted)" }}
            >
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
              {badge > 0 && (
                <span
                  className="absolute top-2 right-1/4 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "var(--amber)", color: "#000" }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
      <SubscribeSheet open={subOpen} onClose={() => setSubOpen(false)} />
    </div>
  );
}
