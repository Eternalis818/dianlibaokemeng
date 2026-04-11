import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PENALTY_THRESHOLD = 12;

/** POST /api/worker-penalties — 处罚工人 */
export async function POST(req: NextRequest) {
  try {
    const { workerId, categoryId, reason, fineAmount } = await req.json();
    if (!workerId || !categoryId || !reason) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 获取类别积分
    const catRows = await prisma.$queryRawUnsafe<{ points: number }[]>(
      `SELECT points FROM "PenaltyCategory" WHERE id = ${categoryId} AND "isActive" = true`
    );
    if (catRows.length === 0) return Response.json({ error: "违章类别不存在" }, { status: 404 });
    const points = catRows[0].points;

    const escapedReason = reason.replace(/'/g, "''");

    await prisma.$executeRawUnsafe(
      `INSERT INTO "WorkerPenalty" ("workerId", "categoryId", points, reason, "fineAmount", "finePaid", "createdBy", "createdAt")
       VALUES ('${workerId}', ${categoryId}, ${points}, '${escapedReason}', ${fineAmount || 0}, false, 'admin', NOW())`
    );

    // 累加扣分 + 检查阈值
    await prisma.$executeRawUnsafe(
      `UPDATE "Worker" SET "penaltyPoints" = "penaltyPoints" + ${points},
        "isLocked" = CASE WHEN "penaltyPoints" + ${points} >= ${PENALTY_THRESHOLD} THEN true ELSE "isLocked" END
       WHERE id = '${workerId}'`
    );

    return Response.json({ ok: true, points, locked: true }, { status: 201 });
  } catch (e) {
    console.error("worker-penalties POST error:", e);
    return Response.json({ error: "处罚失败" }, { status: 500 });
  }
}
