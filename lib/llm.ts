/**
 * 多模型 LLM 调用工具
 * 支持按功能（feature）分配不同模型配置
 *
 * 配置体系：
 * - 默认配置：llm_api_key / llm_model / llm_base_url
 * - 功能配置：{feature}_api_key / {feature}_model / {feature}_base_url
 * - 优先级：功能配置 > 默认配置 > 环境变量
 *
 * 支持的功能：
 * - default    — 默认（智能拆解、工人聊天等）
 * - photo      — 照片复核（需多模态模型）
 * - summary    — Boss AI 摘要
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type LLMFeature = "default" | "photo" | "summary";

interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];  // 支持 text + image_url 多模态
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

// ─── Config Resolution ─────────────────────────────────────────────────

// 内存缓存（60秒过期）
const configCache = new Map<string, { config: LLMConfig; expiry: number }>();

/** Read a single setting value from DB */
async function getSettingsMap(): Promise<Record<string, string>> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
      `SELECT "key", "value" FROM "Settings"`
    );
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

/** Get LLM config for a specific feature */
export async function getLLMConfig(feature: LLMFeature = "default"): Promise<LLMConfig> {
  const cacheKey = feature;
  const cached = configCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) return cached.config;

  const settings = await getSettingsMap();

  // Per-feature prefix: "photo" → "photo_api_key", "photo_model", "photo_base_url"
  const prefix = feature === "default" ? "llm" : feature;

  const resolve = (key: string, envKey: string): string => {
    return (settings[`${prefix}_${key}`] || settings[`llm_${key}`] || process.env[envKey] || "").replace(/\/+$/, "");
  };

  const config: LLMConfig = {
    apiKey: resolve("api_key", "LLM_API_KEY"),
    model: resolve("model", "LLM_MODEL"),
    baseUrl: resolve("base_url", "LLM_BASE_URL"),
  };

  configCache.set(cacheKey, { config, expiry: Date.now() + 60_000 });
  return config;
}

/** Clear config cache (call after settings update) */
export function clearLLMConfigCache() {
  configCache.clear();
}

// ─── Chat Completion ───────────────────────────────────────────────────

/**
 * Call LLM Chat Completions API for a specific feature
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: LLMOptions,
  feature: LLMFeature = "default"
) {
  const config = await getLLMConfig(feature);

  if (!config.apiKey) {
    throw new Error("LLM API Key 未配置，请在系统设置中配置");
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: options?.maxTokens ?? 1500,
      temperature: options?.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Test LLM connection for a specific feature config
 */
export async function testLLMConnection(feature: LLMFeature = "default"): Promise<{ ok: boolean; message: string; model?: string }> {
  try {
    const config = await getLLMConfig(feature);
    if (!config.apiKey) return { ok: false, message: "API Key 未配置" };
    if (!config.baseUrl) return { ok: false, message: "API 地址未配置" };
    if (!config.model) return { ok: false, message: "模型名称未配置" };

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "你好，请回复OK" }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: `API 返回错误 (${res.status}): ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, message: `连接成功！模型回复: ${reply}`, model: config.model };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, message: `连接失败: ${msg}` };
  }
}

// ─── Feature Config Helpers ─────────────────────────────────────────────

/** Feature metadata for settings page UI */
export const LLM_FEATURES: { key: LLMFeature; label: string; desc: string }[] = [
  { key: "default", label: "默认模型", desc: "智能拆解、工人聊天等文本任务" },
  { key: "photo", label: "视觉模型", desc: "照片复核、多模态分析（需视觉能力）" },
  { key: "summary", label: "摘要模型", desc: "Boss AI 摘要、报告生成" },
];
