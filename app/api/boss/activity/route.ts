import { NextRequest } from "next/server";
import { trackActivity } from "@/lib/activity";

/** POST /api/boss/activity — 更新活跃时间（轻量调用） */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("pl_boss")?.value || "";
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (bossIdMatch) {
      await trackActivity(parseInt(bossIdMatch[1]));
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true }); // non-critical, always return ok
  }
}
