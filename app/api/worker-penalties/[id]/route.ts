import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/worker-penalties/[id] — 标记罚款已付 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "WorkerPenalty" SET "finePaid" = true WHERE id = ${parseInt(id)}`
    );
    return Response.json({ ok: true });
  } catch (e) {
    console.error("worker-penalty PATCH error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}
