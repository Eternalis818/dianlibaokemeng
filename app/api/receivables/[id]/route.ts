import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/receivables/[id] — 更新收款台账/节点 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // 更新台账基本信息
    const { receivedAmount, status, notes, milestoneId, milestoneStatus, providedDocs, actualDate } = body;

    if (milestoneId) {
      // 更新节点
      const sets: string[] = [];
      if (milestoneStatus) sets.push(`status = '${milestoneStatus}'`);
      if (providedDocs !== undefined) {
        sets.push(`"providedDocs" = '${JSON.stringify(providedDocs).replace(/'/g, "''")}'`);
        // 判断资料是否齐备
        const ms = await prisma.$queryRawUnsafe<any[]>(`SELECT "requiredDocs" FROM "ReceivableMilestone" WHERE "id" = ${milestoneId}`);
        let reqDocs: string[] = [];
        try { reqDocs = ms[0]?.requiredDocs ? JSON.parse(ms[0].requiredDocs) : []; } catch {}
        const ready = reqDocs.length === 0 || reqDocs.every((d: string) => providedDocs.includes(d));
        sets.push(`"docsReady" = ${ready}`);
      }
      if (actualDate) sets.push(`"actualDate" = '${actualDate}'`);
      sets.push(`"updatedAt" = now()`);

      if (sets.length > 0) {
        await prisma.$executeRawUnsafe(`UPDATE "ReceivableMilestone" SET ${sets.join(", ")} WHERE "id" = ${milestoneId}`);
      }

      // 如果节点已收款，更新已收金额
      if (milestoneStatus === "collected") {
        await prisma.$executeRawUnsafe(`
          UPDATE "Receivable" SET "receivedAmount" = (
            SELECT COALESCE(SUM(amount), 0) FROM "ReceivableMilestone"
            WHERE "receivableId" = ${id} AND status = 'collected'
          ), "updatedAt" = now() WHERE "id" = ${id}
        `);
      }
    } else {
      // 更新台账
      const sets: string[] = [];
      if (receivedAmount !== undefined) sets.push(`"receivedAmount" = ${receivedAmount}`);
      if (status) sets.push(`status = '${status}'`);
      if (notes !== undefined) sets.push(notes ? `notes = '${notes.replace(/'/g, "''")}'` : "notes = NULL");
      sets.push(`"updatedAt" = now()`);

      if (sets.length > 0) {
        await prisma.$executeRawUnsafe(`UPDATE "Receivable" SET ${sets.join(", ")} WHERE "id" = ${id}`);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("receivable update error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/receivables/[id] — 删除收款台账 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.$executeRawUnsafe(`DELETE FROM "Receivable" WHERE "id" = ${id}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("receivable delete error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
