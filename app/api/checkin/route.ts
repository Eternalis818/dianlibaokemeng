import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

/** 计算两点间距离（米），Haversine */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workerId, project, gpsLat, gpsLng, action } = body;

  if (!workerId) return Response.json({ error: "workerId required" }, { status: 400 });

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) return Response.json({ error: "工人不存在" }, { status: 404 });

  // ── 锁定检查 ──────────────────────────────────────────────────────────────
  if ((worker as any).isLocked) {
    return Response.json({ error: "账号已锁定，需完成安规学习", code: "LOCKED" }, { status: 403 });
  }

  // ── 规则确认检查 ──────────────────────────────────────────────────────────
  const unconfirmedRules = await prisma.$queryRawUnsafe<{ id: number }[]>(
    `SELECT sr.id FROM "SiteRule" sr
     WHERE sr."isActive" = true AND NOT EXISTS (
       SELECT 1 FROM "RuleConfirmation" rc WHERE rc."workerId" = '${workerId}' AND rc."ruleId" = sr.id AND rc."ruleVersion" = sr.version
     ) LIMIT 1`
  );
  if (unconfirmedRules.length > 0) {
    return Response.json({ error: "有未确认的进场须知规则", code: "RULES_UNCONFIRMED" }, { status: 403 });
  }

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // ── 签退逻辑 ──────────────────────────────────────────────────────────────
  if (action === "checkout") {
    const existing = await prisma.checkIn.findFirst({
      where: { workerId, createdAt: { gte: todayUTC } },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) return Response.json({ error: "今日尚未签到" }, { status: 400 });
    if (existing.checkOut) return Response.json(existing); // 已签退

    const now = new Date();
    const duration = Math.round((now.getTime() - existing.createdAt.getTime()) / 60000);
    const updated = await prisma.checkIn.update({
      where: { id: existing.id },
      data: { checkOut: now, duration },
    });

    await writeAudit({
      tableName: "CheckIn",
      recordId: existing.id,
      field: "checkOut",
      oldValue: null,
      newValue: now.toISOString(),
      action: "update",
    });

    return Response.json(updated);
  }

  // ── 签到逻辑 ──────────────────────────────────────────────────────────────
  // 幂等：同一工人同一天只创建一条记录
  const existing = await prisma.checkIn.findFirst({
    where: { workerId, createdAt: { gte: todayUTC } },
  });
  if (existing) return Response.json(existing);

  const projectName = project ?? worker.project;

  // Geofencing 判断
  let checkInType = "manual";
  let fenceResult: { inFence: boolean; distance?: number } = { inFence: true };

  if (gpsLat != null && gpsLng != null) {
    const proj = await prisma.project.findFirst({ where: { name: projectName } });
    if (proj?.centerLat != null && proj?.centerLng != null && proj?.geoRadius != null) {
      const dist = haversineMeters(gpsLat, gpsLng, proj.centerLat, proj.centerLng);
      fenceResult = { inFence: dist <= proj.geoRadius, distance: Math.round(dist) };
      checkInType = dist <= proj.geoRadius ? "auto_in" : "manual";
    } else {
      checkInType = "auto_in";
    }
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      workerId,
      project: projectName,
      type: checkInType,
      gpsLat: gpsLat ?? null,
      gpsLng: gpsLng ?? null,
    },
  });

  await writeAudit({
    tableName: "CheckIn",
    recordId: checkIn.id,
    field: "status",
    oldValue: null,
    newValue: "checked_in",
    action: "create",
    operatorId: workerId,
  });

  return Response.json({ ...checkIn, fenceResult });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const year = searchParams.get("year");

  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  let where: Record<string, unknown> = {};
  if (year) {
    const y = Number(year);
    where = {
      createdAt: {
        gte: new Date(`${y}-01-01T00:00:00Z`),
        lt: new Date(`${y + 1}-01-01T00:00:00Z`),
      },
    };
  } else if (!all) {
    where = { createdAt: { gte: todayUTC } };
  }

  const checkIns = await prisma.checkIn.findMany({
    where,
    include: { worker: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(checkIns);
}
