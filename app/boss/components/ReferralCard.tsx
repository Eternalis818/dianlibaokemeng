"use client";
import { useState } from "react";

export default function ReferralCard({ code, bossName }: { code: string; bossName: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `我是${bossName}，推荐你用「电力宝」管工地！打卡报量、记账审批一部手机搞定。输入推荐码 ${code}，咱俩各得1个月专业版免费体验！`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/boss?ref=${code}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "电力宝 — 推荐有礼", text: shareText, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))", border: "1px solid rgba(139,92,246,0.2)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: "#c084fc" }}>推荐有礼</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc" }}>
          双方各得1个月
        </span>
      </div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        分享你的推荐码给同行，双方各获得1个月专业版免费体验
      </div>
      {/* 推荐码 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>我的推荐码</div>
          <div className="font-mono font-bold text-lg tracking-widest" style={{ color: "#c084fc" }}>{code}</div>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc" }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-98"
        style={{
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          boxShadow: "0 0 16px rgba(139,92,246,0.3)",
        }}
      >
        分享给同行
      </button>
    </div>
  );
}
