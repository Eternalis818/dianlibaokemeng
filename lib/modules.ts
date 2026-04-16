/**
 * 模块配置常量
 * 定义核心模块、可选模块分组、侧边栏渲染依据
 */

// localStorage key
export const MODULE_STORAGE_KEY = "pl_enabled_modules";

// 核心必选模块（首次登录即展示，不可关闭）
export const CORE_MODULES = ["dashboard", "projects", "workers", "reports", "receivables"] as const;

// 系统模块（始终固定底部）
export const SYSTEM_MODULES = ["subscriptions", "payments", "settings"] as const;

// 可选模块分组
export const OPTIONAL_GROUPS = [
  {
    key: "construction",
    label: "施工管控",
    desc: "施工过程偏差追踪与纠正",
    modules: [
      { key: "corrections", label: "纠偏中心" },
    ],
  },
  {
    key: "finance",
    label: "财务延伸",
    desc: "完整财务视角与年度报表",
    modules: [
      { key: "finance", label: "财务核算" },
      { key: "annual", label: "年度汇总" },
    ],
  },
  {
    key: "material",
    label: "物资管理",
    desc: "材料库存与设备台账",
    modules: [
      { key: "materials", label: "材料管控" },
      { key: "equipment", label: "工器具" },
    ],
  },
  {
    key: "compliance",
    label: "合规安全",
    desc: "安全管理与合规培训",
    modules: [
      { key: "penalties", label: "违规扣分" },
      { key: "site-rules", label: "进场须知" },
      { key: "trainings", label: "安规学习" },
    ],
  },
  {
    key: "approval",
    label: "审批流程",
    desc: "签证变更审批管理",
    modules: [
      { key: "visas", label: "签证管理" },
    ],
  },
  {
    key: "ops",
    label: "运维审计",
    desc: "操作日志追溯",
    modules: [
      { key: "audit", label: "审计追踪" },
    ],
  },
  {
    key: "advanced",
    label: "高级功能",
    desc: "AI 调试工具与客服支持",
    modules: [
      { key: "agent", label: "Agent 控制台" },
      { key: "feedback", label: "客服中心" },
    ],
  },
] as const;

// 所有可选模块的 key 列表（扁平）
export const ALL_OPTIONAL_KEYS: string[] = OPTIONAL_GROUPS.flatMap((g) => g.modules.map((m) => m.key));

/** 获取已启用的模块列表（从 localStorage） */
export function getEnabledModules(): string[] {
  if (typeof window === "undefined") return [...CORE_MODULES];
  try {
    const raw = localStorage.getItem(MODULE_STORAGE_KEY);
    if (!raw) return [...CORE_MODULES];
    return JSON.parse(raw);
  } catch {
    return [...CORE_MODULES];
  }
}

/** 保存已启用的模块列表 */
export function setEnabledModules(keys: string[]): void {
  // 始终包含核心模块
  const merged = new Set([...CORE_MODULES, ...keys]);
  localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify([...merged]));
}

/** 判断模块是否可见 */
export function isModuleVisible(key: string): boolean {
  // 核心模块和系统模块始终可见
  if ((CORE_MODULES as readonly string[]).includes(key)) return true;
  if ((SYSTEM_MODULES as readonly string[]).includes(key)) return true;
  // 可选模块看配置
  return getEnabledModules().includes(key);
}

/** 判断是否为首次登录（未配置过模块） */
export function isFirstTimeUser(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(MODULE_STORAGE_KEY);
}
