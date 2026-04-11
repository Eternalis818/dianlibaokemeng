import { NextRequest } from "next/server";
import { testLLMConnection, type LLMFeature } from "@/lib/llm";

/** POST /api/settings/test-connection?feature=default|photo|summary */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const feature = (searchParams.get("feature") || "default") as LLMFeature;
  const result = await testLLMConnection(feature);
  return Response.json(result);
}
