import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/worker/trainings — 工人端获取可用培训列表 */
export async function GET(req: NextRequest) {
  try {
    const workerId = req.headers.get("x-worker-id");
    if (!workerId) return Response.json({ error: "未登录" }, { status: 401 });

    const trainings = await prisma.$queryRawUnsafe<
      { id: number; title: string; content: string; version: number }[]
    >(`SELECT id, title, content, version FROM "SafetyTraining" WHERE "isActive" = true ORDER BY "createdAt" ASC`);

    // Get latest exam attempt for each training
    const attempts = await prisma.$queryRawUnsafe<
      { trainingId: number; passed: boolean; score: number; "pointsCleared": number }[]
    >(`SELECT DISTINCT ON ("trainingId") "trainingId", passed, score, "pointsCleared"
       FROM "ExamAttempt" WHERE "workerId" = '${workerId}'
       ORDER BY "trainingId", "createdAt" DESC`);

    const attemptMap = new Map(attempts.map((a) => [a.trainingId, a]));

    const result = trainings.map((t) => ({
      ...t,
      attempt: attemptMap.get(t.id) || null,
    }));

    return Response.json(result);
  } catch (e) {
    console.error("worker trainings GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
