import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST /api/boss/auth — 老板登录（手机号 + PIN） */
export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "请输入手机号和PIN码" }, { status: 400 });
    }

    const boss = await prisma.$queryRaw<
      { id: number; name: string; phone: string; project: string | null; role: string }[]
    >`SELECT "id", "name", "phone", "project", "role" FROM "Boss" WHERE "phone" = ${phone} AND "loginPin" = ${pin} AND "isActive" = true LIMIT 1`;

    if (!boss.length) {
      return NextResponse.json({ error: "手机号或PIN码错误" }, { status: 401 });
    }

    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "服务器未配置" }, { status: 500 });
    }

    // 签名 token: boss:{id}:{secret}
    const token = `boss:${boss[0].id}:${secret}`;

    const res = NextResponse.json({
      ok: true,
      boss: boss[0],
    });

    res.cookies.set("pl_boss", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("boss auth error:", e);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}

/** DELETE /api/boss/auth — 老板登出 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pl_boss", "", { maxAge: 0, path: "/" });
  return res;
}
