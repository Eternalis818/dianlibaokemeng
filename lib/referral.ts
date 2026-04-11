import { prisma } from "@/lib/prisma";

/** 生成 6 位推荐码（字母+数字） */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉容易混淆的 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 为老板生成唯一推荐码 */
export async function ensureReferralCode(bossId: number): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<{ referralCode: string | null }[]>(
    `SELECT "referralCode" FROM "Boss" WHERE id = ${bossId}`
  );
  if (rows[0]?.referralCode) return rows[0].referralCode;

  // 生成唯一码
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "Boss" WHERE "referralCode" = '${code}'`
    );
    if (existing.length === 0) break;
    code = generateReferralCode();
    attempts++;
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "Boss" SET "referralCode" = '${code}' WHERE id = ${bossId}`
  );
  return code;
}

/** 验证推荐码 */
export async function validateReferral(code: string): Promise<{ valid: boolean; bossId: number; name: string } | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: number; name: string; isActive: boolean }[]>(
      `SELECT id, name, "isActive" FROM "Boss" WHERE "referralCode" = '${code.toUpperCase()}'`
    );
    if (rows.length === 0) return null;
    const boss = rows[0];
    if (!boss.isActive) return null;
    return { valid: true, bossId: boss.id, name: boss.name };
  } catch {
    return null;
  }
}

/** 应用推荐奖励 — 双方各得 1 个月 */
export async function applyReferral(newBossId: number, referralCode: string): Promise<{ ok: boolean; message: string }> {
  const referrer = await validateReferral(referralCode);
  if (!referrer) return { ok: false, message: "推荐码无效" };
  if (referrer.bossId === newBossId) return { ok: false, message: "不能使用自己的推荐码" };

  try {
    // 记录推荐关系
    await prisma.$executeRawUnsafe(
      `UPDATE "Boss" SET "referredBy" = '${referralCode.toUpperCase()}' WHERE id = ${newBossId}`
    );

    // 为推荐人创建奖励（1 个月专业版）
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Payment" ("bossId", amount, currency, "planCode", "billingCycle", "periodStart", "periodEnd", method, status, note, "createdAt")
       VALUES (${referrer.bossId}, 0, 'CNY', 'pro', 'monthly', NOW(), NOW() + INTERVAL '1 month', 'referral_reward', 'confirmed', '推荐奖励 — 1个月专业版', NOW())`
    );

    // 为被推荐人创建奖励
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Payment" ("bossId", amount, currency, "planCode", "billingCycle", "periodStart", "periodEnd", method, status, note, "createdAt")
       VALUES (${newBossId}, 0, 'CNY', 'pro', 'monthly', NOW(), NOW() + INTERVAL '1 month', 'referral_reward', 'confirmed', '新用户推荐奖励 — 1个月专业版', NOW())`
    );

    // 延长双方的订阅
    const proPlan = await prisma.$queryRawUnsafe<{ id: number }[]>(`SELECT id FROM "Plan" WHERE code = 'pro'`);
    if (proPlan.length > 0) {
      for (const bid of [referrer.bossId, newBossId]) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Subscription" ("bossId", "planId", status, "billingCycle", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
           VALUES (${bid}, ${proPlan[0].id}, 'active', 'monthly', NOW(), NOW() + INTERVAL '1 month', NOW())
           ON CONFLICT ("bossId") DO UPDATE SET
             "planId" = ${proPlan[0].id},
             status = 'active',
             "currentPeriodEnd" = GREATEST("Subscription"."currentPeriodEnd", NOW()) + INTERVAL '1 month',
             "updatedAt" = NOW()`
        );
      }
    }

    return { ok: true, message: `推荐成功！你和${referrer.name}各获得1个月专业版` };
  } catch (e) {
    console.error("applyReferral error:", e);
    return { ok: false, message: "推荐码应用失败" };
  }
}
