import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit, diffToAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visa = await prisma.visa.findUnique({ where: { id: Number(id) } });
    if (!visa) return Response.json({ error: "签证不存在" }, { status: 404 });
    return Response.json(visa);
  } catch (e) {
    console.error("[GET /api/visas/:id]", e);
    return Response.json({ error: e instanceof Error ? e.message : "查询失败" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visaId = Number(id);
    const body = await req.json();
    const { operatorId, ...updates } = body;

    // 状态流转校验
    if (updates.status && !["pending", "approved", "rejected"].includes(updates.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.visa.findUnique({ where: { id: visaId } });
    if (!existing) return Response.json({ error: "签证不存在" }, { status: 404 });

    const visa = await prisma.visa.update({
      where: { id: visaId },
      data: updates,
    });

    const auditEntries = diffToAudit("Visa", visaId, existing, visa, operatorId ?? "admin");
    if (auditEntries.length > 0) await writeAudit(auditEntries);

    return Response.json(visa);
  } catch (e) {
    console.error("[PATCH /api/visas/:id]", e);
    return Response.json({ error: e instanceof Error ? e.message : "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.visa.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/visas/:id]", e);
    return Response.json({ error: e instanceof Error ? e.message : "删除失败" }, { status: 500 });
  }
}
