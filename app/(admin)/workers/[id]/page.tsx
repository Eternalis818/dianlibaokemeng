"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Reward {
  id: number; points: number; amount: number; reason: string; createdAt: string;
}
interface Penalty {
  id: number; categoryId: number; categoryName: string; points: number;
  reason: string; fineAmount: number; finePaid: boolean; createdAt: string;
}
interface Category {
  id: number; name: string; points: number; description: string | null;
}
interface Summary {
  worker: {
    id: string; name: string; project: string; phone: string | null;
    idCard: string | null; wageType: string | null; wageRate: number | null;
    rewardPoints: number; penaltyPoints: number; isLocked: boolean;
  };
  rewards: Reward[];
  penalties: Penalty[];
  unconfirmedRules: { id: number; title: string; version: number }[];
}

type Tab = "overview" | "rewards" | "penalties";

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [categories, setCategories] = useState<Category[]>([]);

  // Reward form
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rPoints, setRPoints] = useState("");
  const [rAmount, setRAmount] = useState("");
  const [rReason, setRReason] = useState("");
  const [savingReward, setSavingReward] = useState(false);

  // Penalty form
  const [showPenaltyForm, setShowPenaltyForm] = useState(false);
  const [pCategory, setPCategory] = useState<number | "">("");
  const [pReason, setPReason] = useState("");
  const [pFine, setPFine] = useState("");
  const [savingPenalty, setSavingPenalty] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/workers/${id}/summary`);
      if (!res.ok) { router.push("/workers"); return; }
      const json = await res.json();
      setData(json);
    } catch { router.push("/workers"); }
    setLoading(false);
  }, [id, router]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await fetch("/api/penalty-categories").then((r) => r.json());
      if (Array.isArray(data)) setCategories(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSummary(); fetchCategories(); }, [fetchSummary, fetchCategories]);

  const handleReward = async () => {
    if (!rPoints || !rReason.trim()) return;
    setSavingReward(true);
    try {
      const res = await fetch("/api/worker-rewards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: id, points: parseInt(rPoints), amount: parseFloat(rAmount) || 0, reason: rReason.trim() }),
      });
      if (res.ok) { setShowRewardForm(false); setRPoints(""); setRAmount(""); setRReason(""); fetchSummary(); }
    } catch { /* ignore */ }
    setSavingReward(false);
  };

  const handlePenalty = async () => {
    if (!pCategory || !pReason.trim()) return;
    setSavingPenalty(true);
    try {
      const res = await fetch("/api/worker-penalties", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: id, categoryId: pCategory, reason: pReason.trim(), fineAmount: parseFloat(pFine) || 0 }),
      });
      if (res.ok) { setShowPenaltyForm(false); setPCategory(""); setPReason(""); setPFine(""); fetchSummary(); }
    } catch { /* ignore */ }
    setSavingPenalty(false);
  };

  const handlePayFine = async (penaltyId: number) => {
    try {
      const res = await fetch(`/api/worker-penalties/${penaltyId}`, { method: "PATCH" });
      if (res.ok) fetchSummary();
    } catch { /* ignore */ }
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const w = data.worker;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/workers")} className="text-sm px-2 py-1 rounded-lg" style={{ color: "var(--muted)", background: "var(--bg)" }}>
          ← 返回
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>
                {w.name[0]}
              </div>
              {w.isLocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#ef4444", color: "#fff" }}>锁</div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{w.name}</h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{w.project} {w.phone ? `· ${w.phone}` : ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{w.rewardPoints ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>奖励积分</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: w.penaltyPoints >= 12 ? "#ef4444" : w.penaltyPoints >= 6 ? "#f97316" : "var(--text)" }}>
            {w.penaltyPoints ?? 0}<span className="text-sm">/12</span>
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>违章扣分</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: data.unconfirmedRules.length > 0 ? "#f59e0b" : "var(--green)" }}>
            {data.unconfirmedRules.length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>待确认规则</div>
        </div>
      </div>

      {/* Worker Info */}
      <div className="glass rounded-xl p-4">
        <div className="text-xs font-semibold text-white mb-3">基本信息</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>身份证</span><span className="text-white">{w.idCard || "未填写"}</span></div>
          <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>计薪方式</span><span className="text-white">{w.wageType === "daily" ? "日薪" : w.wageType === "monthly" ? "月薪" : w.wageType === "piecework" ? "计件" : "未设置"}</span></div>
          <div className="flex justify-between"><span style={{ color: "var(--muted)" }}>薪资标准</span><span className="text-white">{w.wageRate ? `¥${w.wageRate}` : "未设置"}</span></div>
          <div className="flex justify-between">
            <span style={{ color: "var(--muted)" }}>状态</span>
            <span style={{ color: w.isLocked ? "#ef4444" : "var(--green)" }}>
              {w.isLocked ? "已锁定（需安规学习）" : "正常"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg)" }}>
        {(["overview", "rewards", "penalties"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 text-xs py-2 rounded-md font-medium transition-all"
            style={{
              background: tab === t ? "var(--surface)" : "transparent",
              color: tab === t ? "white" : "var(--muted)",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}>
            {t === "overview" ? "总览" : t === "rewards" ? "奖励记录" : "处罚记录"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-3">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => { setShowRewardForm(true); setShowPenaltyForm(false); }}
              className="flex-1 text-xs py-2.5 rounded-lg font-medium"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
              + 发奖励
            </button>
            <button onClick={() => { setShowPenaltyForm(true); setShowRewardForm(false); }}
              className="flex-1 text-xs py-2.5 rounded-lg font-medium"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              + 违章处罚
            </button>
          </div>

          {/* Recent Activity */}
          <div className="glass rounded-xl p-4">
            <div className="text-xs font-semibold text-white mb-3">最近动态</div>
            <div className="space-y-2">
              {data.rewards.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>奖励</span>
                    <span className="text-white">{r.reason}</span>
                  </div>
                  <span style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</span>
                </div>
              ))}
              {data.penalties.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>扣{p.points}分</span>
                    <span className="text-white">{p.reason}</span>
                  </div>
                  <span style={{ color: "var(--muted)" }}>{fmtDate(p.createdAt)}</span>
                </div>
              ))}
              {data.rewards.length === 0 && data.penalties.length === 0 && (
                <div className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>暂无记录</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "rewards" && (
        <div className="space-y-3">
          <button onClick={() => setShowRewardForm(!showRewardForm)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            {showRewardForm ? "取消" : "+ 发奖励"}
          </button>

          {showRewardForm && (
            <div className="glass rounded-xl p-4 space-y-3" style={{ borderLeft: "2px solid #f59e0b" }}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>积分 *</div>
                  <input type="number" value={rPoints} onChange={(e) => setRPoints(e.target.value)} placeholder="例：5"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>奖金（元）</div>
                  <input type="number" value={rAmount} onChange={(e) => setRAmount(e.target.value)} placeholder="选填"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>原因 *</div>
                  <input value={rReason} onChange={(e) => setRReason(e.target.value)} placeholder="例：表现优异"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
              </div>
              <button onClick={handleReward} disabled={!rPoints || !rReason.trim() || savingReward}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {savingReward ? "保存中..." : "确认发放"}
              </button>
            </div>
          )}

          {data.rewards.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>暂无奖励记录</div>
          ) : (
            data.rewards.map((r) => (
              <div key={r.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                    +{r.points}
                  </div>
                  <div>
                    <div className="text-sm text-white">{r.reason}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</div>
                  </div>
                </div>
                {r.amount > 0 && (
                  <span className="text-sm font-medium" style={{ color: "#f59e0b" }}>¥{r.amount}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "penalties" && (
        <div className="space-y-3">
          <button onClick={() => setShowPenaltyForm(!showPenaltyForm)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            {showPenaltyForm ? "取消" : "+ 违章处罚"}
          </button>

          {showPenaltyForm && (
            <div className="glass rounded-xl p-4 space-y-3" style={{ borderLeft: "2px solid #ef4444" }}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>违章类别 *</div>
                  <select value={pCategory} onChange={(e) => setPCategory(parseInt(e.target.value))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="" style={{ background: "#0d1929" }}>选择类别</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "#0d1929" }}>{c.name}（{c.points}分）</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>罚款金额（元）</div>
                  <input type="number" value={pFine} onChange={(e) => setPFine(e.target.value)} placeholder="选填"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
                <div>
                  <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>原因说明 *</div>
                  <input value={pReason} onChange={(e) => setPReason(e.target.value)} placeholder="具体情况"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                </div>
              </div>
              <button onClick={handlePenalty} disabled={!pCategory || !pReason.trim() || savingPenalty}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {savingPenalty ? "保存中..." : "确认处罚"}
              </button>
            </div>
          )}

          {data.penalties.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: "var(--muted)" }}>暂无处罚记录</div>
          ) : (
            data.penalties.map((p) => (
              <div key={p.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    -{p.points}
                  </div>
                  <div>
                    <div className="text-sm text-white">{p.reason}</div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: "var(--muted)" }}>
                      <span>{p.categoryName}</span>
                      <span>· {fmtDate(p.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.fineAmount > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-medium" style={{ color: "#ef4444" }}>¥{p.fineAmount}</div>
                      <button onClick={() => handlePayFine(p.id)} disabled={p.finePaid}
                        className="text-[10px] disabled:opacity-50"
                        style={{ color: p.finePaid ? "var(--green)" : "var(--amber)" }}>
                        {p.finePaid ? "已付" : "标记已付"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
