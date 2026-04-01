import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const corrections = await prisma.correction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json(corrections);
}

export async function POST(req: NextRequest) {
  const { workerId, workerName, original, corrected, reason, reportId } = await req.json();

  if (!workerId || !original || !corrected || !reason) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const correction = await prisma.correction.create({
    data: {
      workerId,
      workerName: workerName ?? workerId,
      original,
      corrected,
      reason,
      reportId: reportId ? Number(reportId) : null,
    },
  });
  return Response.json(correction);
}
