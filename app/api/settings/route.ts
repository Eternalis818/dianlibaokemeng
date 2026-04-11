import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearLLMConfigCache } from "@/lib/llm";

// Default LLM settings keys
const LLM_KEYS = ["llm_api_key", "llm_model", "llm_base_url"] as const;
type LLMKey = (typeof LLM_KEYS)[number];

// Per-feature override keys
const FEATURE_KEYS = ["feature_photo_review"] as const;
const FEATURE_MODELS = ["photo", "summary"] as const;
type FeatureModel = (typeof FEATURE_MODELS)[number];

// Push config keys
const PUSH_KEYS = ["push_platform", "push_webhook_url", "push_enabled", "push_daily_time", "push_weekly_day", "push_report_types"] as const;

const KEY_TO_LABEL: Record<LLMKey, string> = {
  llm_api_key: "API Key",
  llm_model: "模型名称",
  llm_base_url: "API 地址",
};

const FEATURE_LABELS: Record<string, string> = {
  feature_photo_review: "AI 照片复核",
};

// All setting keys to read
const ALL_KEYS = [
  ...LLM_KEYS,
  ...FEATURE_KEYS,
  ...FEATURE_MODELS.flatMap((f) => [`${f}_api_key`, `${f}_model`, `${f}_base_url`]),
  ...PUSH_KEYS,
];

function defaults(): Record<LLMKey, string> {
  return {
    llm_api_key: process.env.LLM_API_KEY ?? "",
    llm_model: process.env.LLM_MODEL ?? "",
    llm_base_url: process.env.LLM_BASE_URL ?? "",
  };
}

/** GET /api/settings */
export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
      `SELECT "key", "value" FROM "Settings" WHERE "key" IN (${ALL_KEYS.map((k) => `'${k}'`).join(", ")})`
    );
    const dbMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const def = defaults();

    // Default LLM settings
    const settings: Record<string, { label: string; value: string; source: "db" | "env"; masked?: boolean }> = {};
    for (const key of LLM_KEYS) {
      const val = dbMap[key];
      settings[key] = {
        label: KEY_TO_LABEL[key],
        value: val ?? def[key] ?? "",
        source: val !== undefined ? "db" : "env",
      };
    }
    if (settings.llm_api_key.value.length > 8) {
      settings.llm_api_key.value = "sk-***" + settings.llm_api_key.value.slice(-4);
      settings.llm_api_key.masked = true;
    }

    // Per-feature model configs (masked api keys)
    const featureConfigs: Record<string, { apiKey: string; model: string; baseUrl: string }> = {};
    for (const feat of FEATURE_MODELS) {
      const apiKey = dbMap[`${feat}_api_key`] || "";
      const model = dbMap[`${feat}_model`] || "";
      const baseUrl = dbMap[`${feat}_base_url`] || "";
      if (model || baseUrl || apiKey) {
        featureConfigs[feat] = {
          apiKey: apiKey.length > 8 ? "sk-***" + apiKey.slice(-4) : apiKey,
          model, baseUrl,
        };
      }
    }

    // Feature toggles
    const features: Record<string, { label: string; enabled: boolean }> = {};
    for (const key of FEATURE_KEYS) {
      features[key] = {
        label: FEATURE_LABELS[key] || key,
        enabled: dbMap[key] === "on",
      };
    }

    // Push config
    const pushConfig: Record<string, string> = {};
    for (const key of PUSH_KEYS) {
      pushConfig[key] = dbMap[key] || "";
    }
    // Mask webhook URL
    if (pushConfig.push_webhook_url && pushConfig.push_webhook_url.length > 20) {
      pushConfig.push_webhook_url =
        pushConfig.push_webhook_url.slice(0, 10) + "***" + pushConfig.push_webhook_url.slice(-8);
    }

    return Response.json({ success: true, settings, features, featureConfigs, pushConfig });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}

/** PUT /api/settings */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const def = defaults();

    // Save default LLM settings
    for (const key of LLM_KEYS) {
      let value: string | undefined = body[key];
      if (key === "llm_api_key" && (!value || value.startsWith("sk-***"))) continue;
      if (value === undefined || value === "") continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Settings" ("key", "value", "updatedAt") VALUES ('${key}', '${value.replace(/'/g, "''")}', NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
      );
    }

    // Save per-feature model overrides
    for (const feat of ["photo", "summary"]) {
      for (const field of ["api_key", "model", "base_url"]) {
        const key = `${feat}_${field}`;
        const value = body[key];
        if (value === undefined) continue;
        // Skip masked api keys
        if (field === "api_key" && (!value || value.startsWith("sk-***"))) continue;
        // Empty value = delete override (fallback to default)
        if (value === "") {
          await prisma.$executeRawUnsafe(`DELETE FROM "Settings" WHERE "key" = '${key}'`);
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Settings" ("key", "value", "updatedAt") VALUES ('${key}', '${value.replace(/'/g, "''")}', NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
          );
        }
      }
    }

    // Feature toggles
    const features = body.features;
    if (features) {
      let parsed: Record<string, boolean>;
      try { parsed = typeof features === "string" ? JSON.parse(features) : features; } catch { parsed = {}; }
      for (const [key, enabled] of Object.entries(parsed)) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Settings" ("key", "value", "updatedAt") VALUES ('${key}', '${enabled ? "on" : "off"}', NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
        );
      }
    }

    // Push config
    const pushData = body.push;
    if (pushData) {
      for (const [key, value] of Object.entries(pushData as Record<string, string>)) {
        if (!key.startsWith("push_")) continue;
        // Skip masked webhook URLs
        if (key === "push_webhook_url" && value.includes("***")) continue;
        if (value === "" || value === undefined) {
          await prisma.$executeRawUnsafe(`DELETE FROM "Settings" WHERE "key" = '${key}'`);
        } else {
          const safeVal = String(value).replace(/'/g, "''");
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Settings" ("key", "value", "updatedAt") VALUES ('${key}', '${safeVal}', NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"`
          );
        }
      }
    }

    // Clear LLM config cache so changes take effect immediately
    clearLLMConfigCache();

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "unknown" }, { status: 500 });
  }
}
