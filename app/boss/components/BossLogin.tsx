"use client";
import { useState } from "react";

interface BossLoginProps {
  onLogin: (boss: { id: number; name: string; phone: string; project: string | null; role: string }) => void;
}

export default function BossLogin({ onLogin }: BossLoginProps) {
  const [phone, setPhone] = useState("");
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handlePinDigit = (d: string) => {
    if (pinDigits.length >= 6) return;
    const next = [...pinDigits, d];
    setPinDigits(next);
    setError(null);
    if (next.length >= 4) {
      doLogin(phone, next.join(""));
    }
  };

  const handleBackspace = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setError(null);
  };

  const doLogin = async (ph: string, pin: string) => {
    if (!ph || ph.length < 11) {
      setError("请先输入手机号");
      setPinDigits([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/boss/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: ph, pin }),
      });
      const data = await res.json();
      if (data.ok && data.boss) {
        sessionStorage.setItem("boss_auth", JSON.stringify(data.boss));
        onLogin(data.boss);
      } else {
        setError(data.error || "登录失败");
        setPinDigits([]);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("网络错误");
      setPinDigits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-8"
      style={{ background: "#0a0a0f" }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "var(--accent)", boxShadow: "0 0 32px var(--accent-glow)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="text-lg font-bold text-white">PowerLink OS</div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          分包老板 · 请登录
        </div>
      </div>

      {/* 手机号 */}
      <div className="w-full max-w-xs mb-6">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="手机号"
          className="w-full px-4 py-3 rounded-xl text-center text-base font-mono tracking-widest"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "white",
          }}
          maxLength={11}
        />
      </div>

      {/* PIN 指示器 */}
      <div
        className={`flex gap-3 mb-6 ${shake ? "animate-shake" : ""}`}
        style={{
          animation: shake ? "shake 0.4s ease-in-out" : undefined,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full transition-all"
            style={{
              background: pinDigits[i]
                ? "var(--accent)"
                : "rgba(255,255,255,0.1)",
              boxShadow: pinDigits[i] ? "0 0 8px var(--accent-glow)" : "none",
            }}
          />
        ))}
      </div>

      {error && (
        <div className="text-xs mb-4" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* 数字键盘 */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => handlePinDigit(String(d))}
            disabled={loading}
            className="py-3.5 rounded-xl text-lg font-medium text-white active:scale-95 transition-all"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePinDigit("0")}
          disabled={loading}
          className="py-3.5 rounded-xl text-lg font-medium text-white active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="py-3.5 rounded-xl text-lg text-white active:scale-95 transition-all"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          ⌫
        </button>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
