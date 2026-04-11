import { testLLMConnection } from "@/lib/llm";

/** POST /api/settings/test-connection — 测试 LLM 连接 */
export async function POST() {
  const result = await testLLMConnection();
  return Response.json(result);
}
