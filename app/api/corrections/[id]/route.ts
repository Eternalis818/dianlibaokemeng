import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json();

  if (!["pending", "approved", "rejected"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const correction = await prisma.correction.update({
    where: { id: Number(id) },
    data: { status },
  });

  // If approved and linked to a report, apply the correction to that report
  if (status === "approved" && correction.reportId) {
    try {
      const parsed = JSON.parse(correction.corrected) as {
        task?: string;
        spec?: string;
        qty?: string;
      };
      const updateData: { task?: string; spec?: string; qty?: string } = {};
      if (parsed.task) updateData.task = parsed.task;
      if (parsed.spec) updateData.spec = parsed.spec;
      if (parsed.qty) updateData.qty = parsed.qty;
      if (Object.keys(updateData).length > 0) {
        await prisma.report.update({
          where: { id: correction.reportId },
          data: updateData,
        });
      }
    } catch {
      // corrected is plain text (legacy) — no report update needed
    }
  }

  return Response.json(correction);
}
