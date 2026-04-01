import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const workerId = searchParams.get("workerId");

  const where: { project?: string; workerId?: string } = {};
  if (project) where.project = project;
  if (workerId) where.workerId = workerId;

  const reports = await prisma.report.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return Response.json(reports);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workerId, workerName, project, task, spec, qty, photoPath } = body;

  if (!workerId || !task || !spec || !qty) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      workerId,
      workerName: workerName ?? workerId,
      project: project ?? "汇龙配电所改造",
      task,
      spec,
      qty,
      photoPath: photoPath ?? null,
    },
  });
  return Response.json(report);
}
