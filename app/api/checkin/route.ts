import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { workerId, project } = await req.json();
  if (!workerId) return Response.json({ error: "workerId required" }, { status: 400 });

  const checkIn = await prisma.checkIn.create({
    data: { workerId, project: project ?? "汇龙配电所改造" },
  });
  return Response.json(checkIn);
}

export async function GET() {
  // Today's check-ins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIns = await prisma.checkIn.findMany({
    where: { createdAt: { gte: today } },
    include: { worker: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(checkIns);
}
