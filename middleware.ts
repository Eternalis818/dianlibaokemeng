import { NextRequest, NextResponse } from "next/server";

// Worker-facing POST paths — no admin auth required
const WORKER_PATHS = [
  "/api/checkin",
  "/api/reports",
  "/api/corrections",
  "/api/worker/chat",
  "/api/worker/smart-parse",
  "/api/worker/photo-review",
  "/api/upload",
  "/api/auth/admin",
  "/api/boss/auth", // boss login/logout
  "/api/plans",     // plan listing (public)
];

// Boss paths that don't require active subscription
const BOSS_NO_SUBSCRIPTION_CHECK = [
  "/api/boss/auth",
  "/api/boss/subscription",
  "/api/boss/subscribe",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // GET requests are public (read-only)
  if (method === "GET") return NextResponse.next();

  // Worker/boss-facing POST paths are exempt from admin auth
  const isWorkerPath = WORKER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isWorkerPath) return NextResponse.next();

  // Boss API paths (except /auth) require boss cookie
  if (pathname.startsWith("/api/boss/")) {
    const token = req.cookies.get("pl_boss")?.value;
    const secret = process.env.ADMIN_SECRET;
    if (!token || !secret || !token.startsWith("boss:") || !token.endsWith(`:${secret}`)) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // Extract bossId from token for downstream use
    const bossIdMatch = token.match(/^boss:(\d+):/);
    if (bossIdMatch) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-boss-id", bossIdMatch[1]);
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
    return NextResponse.next();
  }

  // All other write operations require admin cookie
  const token = req.cookies.get("pl_admin")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "未授权，请先登录管理后台" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
