import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** PATCH /api/debtors/[id] — 更新债主（含联系人管理） */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, creditCode, address, tags, notes, creditScore, contacts } = body;

    const sets: string[] = [];
    if (name !== undefined) sets.push(`name = '${name.replace(/'/g, "''")}'`);
    if (type !== undefined) sets.push(`type = '${type}'`);
    if (creditCode !== undefined) sets.push(creditCode ? `"creditCode" = '${creditCode.replace(/'/g, "''")}'` : `"creditCode" = NULL`);
    if (address !== undefined) sets.push(address ? `address = '${address.replace(/'/g, "''")}'` : "address = NULL");
    if (tags !== undefined) {
      const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;
      sets.push(tagsJson ? `tags = '${tagsJson.replace(/'/g, "''")}'` : "tags = NULL");
    }
    if (notes !== undefined) sets.push(notes ? `notes = '${notes.replace(/'/g, "''")}'` : "notes = NULL");
    if (creditScore !== undefined) sets.push(`"creditScore" = ${creditScore}`);

    if (sets.length > 0) {
      sets.push(`"updatedAt" = now()`);
      await prisma.$executeRawUnsafe(`UPDATE "Debtor" SET ${sets.join(", ")} WHERE "id" = ${id}`);
    }

    // 更新联系人：先删后插
    if (Array.isArray(contacts)) {
      await prisma.$executeRawUnsafe(`DELETE FROM "DebtorContact" WHERE "debtorId" = ${id}`);
      for (const c of contacts) {
        if (!c.name) continue;
        await prisma.$executeRawUnsafe(`
          INSERT INTO "DebtorContact" ("debtorId", name, role, phone, wechat, "relationshipLevel", "isDecisionMaker", "isFinance", notes)
          VALUES (${id}, '${c.name.replace(/'/g, "''")}',
            ${c.role ? `'${c.role.replace(/'/g, "''")}'` : "NULL"},
            ${c.phone ? `'${c.phone.replace(/'/g, "''")}'` : "NULL"},
            ${c.wechat ? `'${c.wechat.replace(/'/g, "''")}'` : "NULL"},
            '${c.relationshipLevel || "normal"}',
            ${c.isDecisionMaker ? "true" : "false"},
            ${c.isFinance ? "true" : "false"},
            ${c.notes ? `'${c.notes.replace(/'/g, "''")}'` : "NULL"})
        `);
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("debtor update error:", e);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/debtors/[id] — 删除债主 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.$executeRawUnsafe(`DELETE FROM "Debtor" WHERE "id" = ${id}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("debtor delete error:", e);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
