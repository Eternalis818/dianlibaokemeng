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

  const report = await prisma.report.update({
    where: { id: Number(id) },
    data: { status },
  });
  return Response.json(report);
}
