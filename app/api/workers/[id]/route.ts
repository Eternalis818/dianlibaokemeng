import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worker = await prisma.worker.findUnique({ where: { id } });
  if (!worker) return Response.json({ error: "Worker not found" }, { status: 404 });
  return Response.json(worker);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowedFields = ["name", "phone", "idCard", "project", "wageType", "wageRate", "insuranceInfo", "loginPin"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    const worker = await prisma.worker.update({
      where: { id },
      data: updates,
    });

    return Response.json(worker);
  } catch (e) {
    console.error("worker patch error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // RC5: check for related records before deleting
    const [checkinCount, reportCount, correctionCount] = await Promise.all([
      prisma.checkIn.count({ where: { workerId: id } }),
      prisma.report.count({ where: { workerId: id } }),
      prisma.correction.count({ where: { workerId: id } }),
    ]);

    const total = checkinCount + reportCount + correctionCount;
    if (total > 0) {
      return Response.json(
        {
          error: `该工人有关联记录（打卡 ${checkinCount} 条、报量 ${reportCount} 条、纠偏 ${correctionCount} 条），无法直接删除`,
        },
        { status: 409 }
      );
    }

    await prisma.worker.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("worker delete error:", e);
    return Response.json({ error: "删除失败，请稍后重试" }, { status: 500 });
  }
}
