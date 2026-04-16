"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  CORE_MODULES,
  SYSTEM_MODULES,
  OPTIONAL_GROUPS,
  ALL_OPTIONAL_KEYS,
  MODULE_STORAGE_KEY,
} from "@/lib/modules";

/** 完整导航项定义 */
const ALL_NAV_ITEMS = [
  // 核心模块
  { key: "dashboard", href: "/dashboard", label: "今日看板", badgeKey: null,
    path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { key: "projects", href: "/projects", label: "项目管理", badgeKey: null,
    path: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { key: "reports", href: "/reports", label: "报量审核", badgeKey: "reports" as const,
    path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "receivables", href: "/receivables", label: "收款管理", badgeKey: null,
    path: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
  // 可选模块
  { key: "corrections", href: "/corrections", label: "纠偏中心", badgeKey: "corrections" as const,
    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { key: "finance", href: "/finance", label: "财务核算", badgeKey: null,
    path: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { key: "materials", href: "/materials", label: "材料管控", badgeKey: null,
    path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { key: "visas", href: "/visas", label: "签证管理", badgeKey: "visas" as const,
    path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "annual", href: "/annual", label: "年度汇总", badgeKey: null,
    path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { key: "workers", href: "/workers", label: "工人管理", badgeKey: null,
    path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { key: "dispatches", href: "/dispatches", label: "派工单", badgeKey: null,
    path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { key: "worker-groups", href: "/worker-groups", label: "工人班组", badgeKey: null,
    path: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { key: "penalties", href: "/penalties", label: "违规扣分", badgeKey: null,
    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { key: "site-rules", href: "/site-rules", label: "进场须知", badgeKey: null,
    path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "trainings", href: "/trainings", label: "安规学习", badgeKey: null,
    path: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { key: "equipment", href: "/equipment", label: "工器具", badgeKey: "equipment" as const,
    path: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" },
  { key: "audit", href: "/audit", label: "审计追踪", badgeKey: null,
    path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { key: "feedback", href: "/feedback", label: "客服中心", badgeKey: null,
    path: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
] as const;

/** 系统模块（底部固定） */
const SYSTEM_NAV = [
  { key: "subscriptions", href: "/subscriptions", label: "订阅管理",
    path: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" },
  { key: "payments", href: "/payments", label: "付款管理",
    path: "M1 4h22v16H1z M1 10h22" },
  { key: "settings", href: "/settings", label: "系统设置",
    path: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" },
  { key: "agent", href: "/agent", label: "Agent 控制台",
    path: "M4 17l6-6-6-6 M12 19h8" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<{ corrections: number; visas: number; reports: number; equipment: number }>({
    corrections: 0, visas: 0, reports: 0, equipment: 0,
  });
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // 加载模块配置
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(MODULE_STORAGE_KEY);
        setEnabledModules(raw ? JSON.parse(raw) : [...CORE_MODULES]);
      } catch {
        setEnabledModules([...CORE_MODULES]);
      }
    };
    load();
    // 监听其他标签页的变化
    const handler = (e: StorageEvent) => {
      if (e.key === MODULE_STORAGE_KEY) load();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // 按模块配置过滤导航项
  const visibleNavItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if ((CORE_MODULES as readonly string[]).includes(item.key)) return true;
      return enabledModules.includes(item.key);
    });
  }, [enabledModules]);

  // Agent 是否可见（单独处理，因为样式特殊）
  const agentVisible = enabledModules.includes("agent");

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const [c, v, rp, eq] = await Promise.all([
          fetch("/api/corrections").then((r) => r.json()),
          fetch("/api/visas").then((r) => r.json()),
          fetch("/api/reports?status=pending&limit=100").then((r) => r.json()),
          fetch("/api/equipment?alert=1").then((r) => r.json()),
        ]);
        setBadges({
          corrections: Array.isArray(c) ? c.filter((x: { status: string }) => x.status === "pending").length : 0,
          visas: Array.isArray(v) ? v.filter((x: { status: string }) => x.status === "pending").length : 0,
          reports: Array.isArray(rp) ? rp.length : 0,
          equipment: Array.isArray(eq) ? eq.length : 0,
        });
      } catch { /* silent */ }
    };
    fetchBadges();
    const id = setInterval(fetchBadges, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-20"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-none">PowerLink OS</div>
            <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--muted)" }}>
              配电施工管理 v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                color: isActive ? "white" : "var(--muted)",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.path} />
              </svg>
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
              {badgeCount > 0 && (
                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.2)", color: "var(--amber)" }}>
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="px-3 pb-4 space-y-2">
        <div className="border-t mb-3" style={{ borderColor: "var(--border)" }} />

        {SYSTEM_NAV.filter((item) => {
          if (item.key === "agent") return agentVisible;
          return true; // 订阅管理、付款管理、系统设置始终显示
        }).map((item) => {
          const isAgent = item.key === "agent";
          const isActive = pathname === item.href;

          if (isAgent) {
            return (
              <Link key={item.key} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.25)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d={item.path} />
                </svg>
                <span style={{ color: "var(--accent)" }}>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link key={item.key} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full"
              style={{
                background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                color: isActive ? "white" : "var(--muted)",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={item.path} />
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
