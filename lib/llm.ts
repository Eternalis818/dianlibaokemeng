/**
 * 通用 LLM 调用工具
 * 支持 OpenAI 兼容 API（MiniMax、火山引擎、DeepSeek 等）
 *
 * 环境变量：
 *   LLM_API_KEY   - API 密钥
 *   LLM_MODEL     - 模型名称
 *   LLM_BASE_URL  - API 基础地址（不含 /chat/completions）
 *
 * 兼容旧配置：
 *   VOLC_API_KEY / VOLC_MODEL / VOLC_BASE_URL 仍可使用
 */

function getLLMConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.VOLC_API_KEY || "",
    model: process.env.LLM_MODEL || process.env.VOLC_MODEL || "",
    baseUrl: (process.env.LLM_BASE_URL || process.env.VOLC_BASE_URL || "").replace(/\/+$/, ""),
  };
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
  const config = getLLMConfig();

  if (!config.apiKey) {
    throw new Error("LLM API Key 未配置");
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
