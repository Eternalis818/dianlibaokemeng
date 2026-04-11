/**
 * 通用 LLM 调用工具
 * 支持 OpenAI 兼容 API（MiniMax、火山引擎、DeepSeek 等）
 *
 * 配置优先级：数据库 Settings 表 > 环境变量
 */

interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

// 内存缓存（60秒过期，避免每次请求都查数据库）
let cachedConfig: LLMConfig | null = null;
let cacheExpiry = 0;

async function getLLMConfigFromDB(): Promise<Partial<LLMConfig> | null> {
  try {
    // 动态导入避免循环依赖
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
      `SELECT "key", "value" FROM "Settings" WHERE "key" IN ('llm_api_key', 'llm_model', 'llm_base_url')`
    );
    if (!rows.length) return null;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      apiKey: map.llm_api_key,
      model: map.llm_model,
      baseUrl: map.llm_base_url,
    };
  } catch {
    return null; // 数据库不可用时回退到环境变量
  }
}

async function getLLMConfig(): Promise<LLMConfig> {
  // 检查缓存
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }

  const dbConfig = await getLLMConfigFromDB();
  const envConfig: LLMConfig = {
    apiKey: process.env.LLM_API_KEY || process.env.VOLC_API_KEY || "",
    model: process.env.LLM_MODEL || process.env.VOLC_MODEL || "",
    baseUrl: (process.env.LLM_BASE_URL || process.env.VOLC_BASE_URL || "").replace(/\/+$/, ""),
  };

  const config: LLMConfig = {
    apiKey: dbConfig?.apiKey || envConfig.apiKey,
    model: dbConfig?.model || envConfig.model,
    baseUrl: (dbConfig?.baseUrl || envConfig.baseUrl).replace(/\/+$/, ""),
  };

  // 缓存 60 秒
  cachedConfig = config;
  cacheExpiry = Date.now() + 60_000;

  return config;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * 调用 LLM Chat Completions API
 */
export async function chatCompletion(messages: ChatMessage[], options?: LLMOptions) {
  const config = await getLLMConfig();

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
 * 测试 LLM 连接（设置页面用）
 */
export async function testLLMConnection(): Promise<{ ok: boolean; message: string; model?: string }> {
  try {
    const config = await getLLMConfig();
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
