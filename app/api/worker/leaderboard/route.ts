import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/worker/leaderboard
 * Query: project (可选，按项目筛选)
 *
 * 多维度排行榜：鸡腿积分、工程量、产值、照片数、出勤天数、安全标兵
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");

  const projectFilter = project ? `AND project = '${project}'` : "";
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const ms = monthStart.toISOString();

  try {
    // 并行查 6 个排行榜
    const [
      chickenLegRows,
      reportCountRows,
      valueRows,
      photoRows,
      attendanceRows,
      safetyRows,
    ] = await Promise.all([
      // 1. 鸡腿积分排行
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT name, project, "rewardPoints"::text as val FROM "Worker" ORDER BY "rewardPoints" DESC NULLS LAST LIMIT 20`
      ),
      // 2. 本月工程量条数排行
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT w.name, w.project, COUNT(r.id)::text as val
         FROM "Worker" w JOIN "Report" r ON r."workerId" = w.id
         WHERE r."createdAt" >= '${ms}' ${project ? `AND r.project = '${project}'` : ""}
         GROUP BY w.id, w.name, w.project ORDER BY val DESC LIMIT 20`
      ),
      // 3. 本月产值排行
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT w.name, w.project, COALESCE(SUM(r."totalValue"), 0)::text as val
         FROM "Worker" w JOIN "Report" r ON r."workerId" = w.id
         WHERE r."createdAt" >= '${ms}' ${project ? `AND r.project = '${project}'` : ""}
         GROUP BY w.id, w.name, w.project ORDER BY val DESC LIMIT 20`
      ),
      // 4. 本月照片数量排行
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT w.name, w.project, COALESCE(SUM(array_length(r."photoUrls", 1)), 0)::text as val
         FROM "Worker" w JOIN "Report" r ON r."workerId" = w.id
         WHERE r."createdAt" >= '${ms}' ${project ? `AND r.project = '${project}'` : ""}
         GROUP BY w.id, w.name, w.project ORDER BY val DESC LIMIT 20`
      ),
      // 5. 本月出勤天数排行
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT w.name, w.project, COUNT(DISTINCT DATE(c."createdAt"))::text as val
         FROM "Worker" w JOIN "CheckIn" c ON c."workerId" = w.id
         WHERE c."createdAt" >= '${ms}' ${project ? `AND c.project = '${project}'` : ""}
         GROUP BY w.id, w.name, w.project ORDER BY val DESC LIMIT 20`
      ),
      // 6. 安全标兵（扣分最少，0分优先）
      prisma.$queryRawUnsafe<{ name: string; project: string; val: string }[]>(
        `SELECT name, project, "penaltyPoints"::text as val FROM "Worker" ORDER BY "penaltyPoints" ASC NULLS FIRST LIMIT 20`
      ),
    ]);

    const fmt = (rows: typeof chickenLegRows) =>
      rows.map((r, i) => ({ rank: i + 1, name: r.name, project: r.project, value: r.val }));

    return Response.json({
      leaderboards: {
        chickenLeg: fmt(chickenLegRows),     // 鸡腿积分
        reportCount: fmt(reportCountRows),   // 工程量条数
        value: fmt(valueRows),               // 产值
        photo: fmt(photoRows),               // 照片数
        attendance: fmt(attendanceRows),     // 出勤天数
        safety: fmt(safetyRows),             // 安全标兵（扣分少）
      },
    });
  } catch (e) {
    console.error("leaderboard error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
