import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/workers/[id]/summary — 工人总览 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

    // 奖罚/规则确认功能已移除，返回空数据
    return Response.json({
      worker,
      rewards: [],
      penalties: [],
      unconfirmedRules: [],
    });
  } catch (e) {
    console.error("worker summary error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
