"use client";
import { useState, useEffect } from "react";
import PlanCard from "./PlanCard";

interface PlanData {
  id: number;
  code: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceYuan: string;
  yearlyPriceYuan: string | null;
  features: Record<string, boolean>;
  aiQuota: number;
  maxProjects: number;
}

interface SubInfo {
  status: string;
  isActive: boolean;
  daysRemaining: number | null;
  plan: { code: string; name: string };
}

export default function SubscribeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [yearly, setYearly] = useState(false);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{ id: number; amount: string; planName: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/plans").then((r) => r.json()),
      fetch("/api/boss/subscription").then((r) => r.json()),
    ]).then(([planData, subData]) => {
      if (Array.isArray(planData)) setPlans(planData);
      if (subData?.subscription) setSub(subData.subscription);
    });
  }, [open]);

  const handleSelect = async (plan: PlanData) => {
    if (plan.code === "trial" || plan.code === "experience") return;
    setLoading(true);
    setPaymentInfo(null);
    try {
      const res = await fetch("/api/boss/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: plan.code,
          billingCycle: plan.code === "lifetime" ? "lifetime" : yearly ? "yearly" : "monthly",
        }),
      });
      const data = await res.json();
      if (data.paymentId) {
        setPaymentInfo({
          id: data.paymentId,
          amount: (data.amount / 100).toFixed(2),
          planName: plan.name,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (!open) return null;

  // 付费套餐（去掉试用和体验月）
  const paidPlans = plans.filter((p) => p.code !== "trial" && p.code !== "experience");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl p-5 pb-10 max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--border)" }} />

        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-white">升级套餐</span>
          {sub && (
            <span className="text-xs px-2 py-1 rounded-full" style={{ color: "var(--muted)", background: "var(--bg)" }}>
              当前：{sub.plan.name}
              {sub.daysRemaining !== null && ` · ${sub.daysRemaining}天`}
            </span>
          )}
        </div>

        {/* Yearly toggle */}
        {paidPlans.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className={`text-xs ${!yearly ? "text-white font-bold" : ""}`} style={{ color: yearly ? "var(--muted)" : undefined }}>
              月付
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className="w-11 h-6 rounded-full relative transition-all"
              style={{ background: yearly ? "var(--accent)" : "var(--border)" }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                style={{ left: yearly ? "22px" : "2px" }}
              />
            </button>
            <span className={`text-xs ${yearly ? "text-white font-bold" : ""}`} style={{ color: !yearly ? "var(--muted)" : undefined }}>
              年付
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}>
                省20%
              </span>
            </span>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-3">
          {paidPlans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              yearly={yearly}
              current={sub?.plan?.code === plan.code}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Payment instructions */}
        {paymentInfo && (
          <div
            className="mt-5 rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <div className="text-sm font-bold" style={{ color: "var(--green)" }}>支付信息已生成</div>
            <div className="text-xs space-y-1.5" style={{ color: "var(--text)" }}>
              <div>套餐：{paymentInfo.planName}</div>
              <div>金额：<span className="font-mono font-bold text-white">¥{paymentInfo.amount}</span></div>
              <div style={{ color: "var(--muted)" }}>
                请添加客服微信转账，备注手机号。确认后立即开通。
              </div>
            </div>
            <div
              className="text-center py-2 rounded-xl text-xs"
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            >
              客服微信：PowerLink_服务（示例）
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        )}
      </div>
    </div>
  );
}
