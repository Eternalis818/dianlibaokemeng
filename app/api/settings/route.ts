import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// LLM 相关设置 key 列表（其他 key 不会暴露给前端）
const LLM_KEYS = ["llm_api_key", "llm_model", "llm_base_url"] as const;
type LLMKey = (typeof LLM_KEYS)[number];

// Feature toggle keys
const FEATURE_KEYS = ["feature_photo_review"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

const KEY_TO_LABEL: Record<LLMKey, string> = {
  llm_api_key: "API Key",
  llm_model: "模型名称",
  llm_base_url: "API 地址",
};

const FEATURE_LABELS: Record<FeatureKey, string> = {
  feature_photo_review: "AI 照片复核",
};

// 默认值：从 .env 环境变量读取
function defaults(): Record<LLMKey, string> {
  return {
    llm_api_key: process.env.LLM_API_KEY ?? "",
    llm_model: process.env.LLM_MODEL ?? "",
    llm_base_url: process.env.LLM_BASE_URL ?? "",
  };
}

/** GET /api/settings — 读取 LLM 设置 + Feature 开关 */
export async function GET() {
  try {
    const allKeys = [...LLM_KEYS, ...FEATURE_KEYS];
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
      `SELECT "key", "value" FROM "Settings" WHERE "key" IN (${allKeys.map((k) => `'${k}'`).join(", ")})`
    );
    const dbMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const def = defaults();

    const result: Record<string, { label: string; value: string; source: "db" | "env"; masked?: boolean }> = {};
    for (const key of LLM_KEYS) {
      const val = dbMap[key];
      result[key] = {
        label: KEY_TO_LABEL[key],
        value: val ?? def[key] ?? "",
        source: val !== undefined ? "db" : "env",
      };
    }

    // API Key 脱敏：只显示末4位
    if (result.llm_api_key.value.length > 8) {
      result.llm_api_key.value =
        "sk-***" + result.llm_api_key.value.slice(-4);
      result.llm_api_key.masked = true;
    }

    // Feature toggles
    const features: Record<string, { label: string; enabled: boolean }> = {};
    for (const key of FEATURE_KEYS) {
      features[key] = {
        label: FEATURE_LABELS[key],
        enabled: dbMap[key] === "on",
      };
    }

    return Response.json({ success: true, settings: result, features });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: msg }, { status: 500 });
  }
}

/** PUT /api/settings — 保存 LLM 设置 + Feature 开关 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const def = defaults();

    for (const key of LLM_KEYS) {
      let value: string | undefined = body[key];

      // API Key 脱敏时前端不会发回完整值，跳过空/脱敏值
      if (key === "llm_api_key" && (!value || value.startsWith("sk-***"))) {
        continue;
      }
      if (value === undefined || value === "") continue;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "Settings" ("key", "value", "updatedAt")
         VALUES ('${key}', '${value.replace(/'/g, "''")}', NOW())
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
      );
    }

    // Feature toggles
    const features = body.features as Record<string, boolean> | undefined;
    if (features) {
      for (const [key, enabled] of Object.entries(features)) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Settings" ("key", "value", "updatedAt")
           VALUES ('${key}', '${enabled ? "on" : "off"}', NOW())
           ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
        );
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: msg }, { status: 500 });
  }
}
