"use client";
import { useState, useEffect, useCallback } from "react";

interface PaymentRecord {
  id: number;
  amount: number;
  amountYuan: string;
  planCode: string;
  billingCycle: string;
  method: string;
  status: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  note: string | null;
  createdAt: string;
  bossName: string;
  bossPhone: string;
}

const PLAN_NAMES: Record<string, string> = {
  trial: "试用版", experience: "体验月", basic: "基础版",
  pro: "专业版", flagship: "旗舰版", lifetime: "终身版",
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待确认", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  confirmed: { label: "已确认", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  failed: { label: "已拒绝", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  refunded: { label: "已退款", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const url = filter ? `/api/admin/payments?status=${filter}` : "/api/admin/payments";
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setPayments(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleAction = async (id: number, action: "confirm" | "reject") => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id, action }),
      });
      if (res.ok) fetchPayments();
    } catch { /* ignore */ }
    setProcessing(null);
  };

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">付款管理</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {pendingCount > 0 ? `${pendingCount} 笔待确认` : "暂无待处理付款"}
          </p>
        </div>
        <div className="flex gap-2">
          {["", "pending", "confirmed", "failed"].map((s) => (
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
              {s === "" ? "全部" : STATUS_STYLES[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无付款记录</div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const ss = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
            return (
              <div
                key={p.id}
                className="rounded-xl p-4"
                style={{
                  background: "var(--surface)",
                  border: p.status === "pending" ? "1px solid rgba(245,158,11,0.3)" : "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-white">{p.bossName}</span>
                    <span className="text-xs ml-2 font-mono" style={{ color: "var(--muted)" }}>{p.bossPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">¥{p.amountYuan}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: ss.color, background: ss.bg }}>
                      {ss.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
                  <span>{PLAN_NAMES[p.planCode] || p.planCode}</span>
                  <span>{p.billingCycle === "yearly" ? "年付" : p.billingCycle === "lifetime" ? "买断" : "月付"}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                {p.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAction(p.id, "confirm")}
                      disabled={processing === p.id}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)" }}
                    >
                      {processing === p.id ? "处理中..." : "确认收款"}
                    </button>
                    <button
                      onClick={() => handleAction(p.id, "reject")}
                      disabled={processing === p.id}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                    >
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
