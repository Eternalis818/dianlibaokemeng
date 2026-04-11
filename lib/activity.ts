import { prisma } from "@/lib/prisma";

/** 更新老板最后活跃时间 */
export async function trackActivity(bossId: number): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Subscription" SET "lastActivityAt" = NOW() WHERE "bossId" = ${bossId}`
    );
  } catch { /* non-critical */ }
}

/** 获取不活跃老板列表 */
export async function getInactiveBosses(days: number = 3): Promise<{ bossId: number; name: string; phone: string; daysSinceActivity: number }[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ bossId: number; name: string; phone: string; daysSinceActivity: number }[]>(
      `SELECT b.id as "bossId", b.name, b.phone,
              EXTRACT(DAY FROM NOW() - s."lastActivityAt")::int as "daysSinceActivity"
       FROM "Subscription" s
       JOIN "Boss" b ON s."bossId" = b.id
       WHERE s.status IN ('active', 'trial')
         AND s."lastActivityAt" < NOW() - INTERVAL '${days} days'
       ORDER BY s."lastActivityAt" ASC`
    );
    return rows;
  } catch {
    return [];
  }
}
