import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/worker-rewards — 发奖励 */
export async function POST(req: NextRequest) {
  try {
    const { workerId, points, amount, reason } = await req.json();
    if (!workerId || !points || points <= 0 || !reason) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WorkerReward" ("workerId", points, amount, reason, "createdBy", "createdAt")
       VALUES ('${workerId}', ${points}, ${amount || 0}, '${reason.replace(/'/g, "''")}', 'admin', NOW())`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Worker" SET "rewardPoints" = "rewardPoints" + ${points} WHERE id = '${workerId}'`
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("worker-rewards POST error:", e);
    return Response.json({ error: "发放失败" }, { status: 500 });
  }
}
