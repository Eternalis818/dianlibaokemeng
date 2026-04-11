import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/worker/rules — 工人端获取活跃规则+确认状态 */
export async function GET(req: NextRequest) {
  try {
    const workerId = req.headers.get("x-worker-id");
    if (!workerId) return Response.json({ error: "未登录" }, { status: 401 });

    // 获取所有活跃规则
    const rules = await prisma.$queryRawUnsafe<
      { id: number; title: string; content: string; version: number }[]
    >(`SELECT id, title, content, version FROM "SiteRule" WHERE "isActive" = true ORDER BY "createdAt" ASC`);

    // 获取该工人已确认的规则
    const confirmed = await prisma.$queryRawUnsafe<
      { ruleId: number; ruleVersion: number }[]
    >(`SELECT "ruleId", "ruleVersion" FROM "RuleConfirmation" WHERE "workerId" = '${workerId}'`);

    const confirmedSet = new Set(confirmed.map((c) => `${c.ruleId}:${c.ruleVersion}`));

    const result = rules.map((r) => ({
      ...r,
      confirmed: confirmedSet.has(`${r.id}:${r.version}`),
    }));

    return Response.json(result);
  } catch (e) {
    console.error("worker rules GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
