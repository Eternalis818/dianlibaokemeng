import { NextRequest } from "next/server";
import { ensureReferralCode, applyReferral } from "@/lib/referral";

/** GET /api/boss/referral — 获取推荐码 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) return Response.json({ error: "未登录" }, { status: 401 });
    const bossId = parseInt(bossIdMatch[1]);

    const code = await ensureReferralCode(bossId);
    return Response.json({ code });
  } catch (e) {
    console.error("boss referral GET error:", e);
    return Response.json({ code: null });
  }
}

/** POST /api/boss/referral — 使用推荐码 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (!bossIdMatch) return Response.json({ error: "未登录" }, { status: 401 });
    const bossId = parseInt(bossIdMatch[1]);

    const { code } = await req.json();
    if (!code) return Response.json({ error: "请输入推荐码" }, { status: 400 });

    const result = await applyReferral(bossId, code);
    if (!result.ok) {
      return Response.json({ error: result.message }, { status: 400 });
    }
    return Response.json({ ok: true, message: result.message });
  } catch (e) {
    console.error("boss referral POST error:", e);
    return Response.json({ error: "推荐码应用失败" }, { status: 500 });
  }
}
