import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/worker/rules/[id] — 工人确认规则 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const workerId = req.headers.get("x-worker-id");
    if (!workerId) return Response.json({ error: "未登录" }, { status: 401 });

    // 获取规则当前版本
    const rules = await prisma.$queryRawUnsafe<{ version: number }[]>(
      `SELECT version FROM "SiteRule" WHERE id = ${parseInt(id)} AND "isActive" = true`
    );
    if (rules.length === 0) return Response.json({ error: "规则不存在" }, { status: 404 });

    const version = rules[0].version;

    // 插入确认记录（UPSERT）
    await prisma.$executeRawUnsafe(
      `INSERT INTO "RuleConfirmation" ("workerId", "ruleId", "ruleVersion", "confirmedAt")
       VALUES ('${workerId}', ${parseInt(id)}, ${version}, NOW())
       ON CONFLICT ("workerId", "ruleId", "ruleVersion") DO NOTHING`
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("worker rule confirm error:", e);
    return Response.json({ error: "确认失败" }, { status: 500 });
  }
}
