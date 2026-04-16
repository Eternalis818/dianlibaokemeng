import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/receivables — 收款台账列表 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const debtorId = searchParams.get("debtorId");

    let where = "";
    const conditions: string[] = [];
    if (status) conditions.push(`r.status = '${status}'`);
    if (debtorId) conditions.push(`r."debtorId" = ${debtorId}`);
    if (conditions.length > 0) where = "WHERE " + conditions.join(" AND ");

    const receivables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT r.*, d.name as "debtorName", d.type as "debtorType", d.tags as "debtorTags", d."creditScore",
        p.name as "projectName",
        COALESCE(json_agg(json_build_object(
          'id', m.id, 'name', m.name, 'percentage', m.percentage, 'amount', m.amount,
          'dueDate', m."dueDate", 'actualDate', m."actualDate",
          'requiredDocs', m."requiredDocs", 'providedDocs', m."providedDocs",
          'docsReady', m."docsReady", 'status', m.status, 'overdueDays', m."overdueDays"
        )) FILTER (WHERE m.id IS NOT NULL), '[]') as milestones
      FROM "Receivable" r
      LEFT JOIN "Debtor" d ON d.id = r."debtorId"
      LEFT JOIN "Project" p ON p.code = r."projectId"
      LEFT JOIN "ReceivableMilestone" m ON m."receivableId" = r.id
      ${where}
      GROUP BY r.id, d.name, d.type, d.tags, d."creditScore", p.name
      ORDER BY r."createdAt" DESC
    `);

    const result = receivables.map((r: any) => {
      let debtorTags: string[] = [];
      try { debtorTags = r.debtorTags ? JSON.parse(r.debtorTags) : []; } catch {}
      const pendingAmount = r.contractAmount - r.receivedAmount;
      // 计算逾期天数
      const now = new Date();
      const contractDate = r.contractDate ? new Date(r.contractDate) : null;
      const statuteRemaining = r.statuteOfLimitDate
        ? Math.ceil((new Date(r.statuteOfLimitDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...r, debtorTags, pendingAmount, statuteRemaining };
    });

    return Response.json(result);
  } catch (e) {
    console.error("receivables list error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/receivables — 创建收款台账 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, debtorId, contractAmount, contractDate, paymentTerms, invoiceRequired, overdueRate, notes, milestones } = body;

    if (!debtorId || !contractAmount) return Response.json({ error: "请填写债主和合同金额" }, { status: 400 });

    // 诉讼时效 = 合同日期 + 3 年
    let statuteDate: string | null = null;
    if (contractDate) {
      const d = new Date(contractDate);
      d.setFullYear(d.getFullYear() + 3);
      statuteDate = d.toISOString();
    }

    const result = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO "Receivable" ("projectId", "debtorId", "contractAmount", "receivedAmount",
        "contractDate", "paymentTerms", "invoiceRequired", "overdueRate", "statuteOfLimitDate", notes)
      VALUES (${projectId ? `'${projectId}'` : "NULL"}, ${debtorId}, ${contractAmount}, 0,
        ${contractDate ? `'${contractDate}'` : "NULL"},
        ${paymentTerms ? `'${paymentTerms.replace(/'/g, "''")}'` : "NULL"},
        ${invoiceRequired ? `'${invoiceRequired}'` : "NULL"},
        ${overdueRate || "NULL"},
        ${statuteDate ? `'${statuteDate}'` : "NULL"},
        ${notes ? `'${notes.replace(/'/g, "''")}'` : "NULL"})
      RETURNING *
    `);

    const receivable = result[0];

    // 创建收款节点
    if (Array.isArray(milestones) && milestones.length > 0) {
      for (const m of milestones) {
        const amount = contractAmount * (m.percentage / 100);
        const reqDocs = m.requiredDocs ? `'${JSON.stringify(m.requiredDocs).replace(/'/g, "''")}'` : "NULL";
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ReceivableMilestone" ("receivableId", name, percentage, amount, "dueDate", "requiredDocs")
          VALUES (${receivable.id}, '${m.name.replace(/'/g, "''")}', ${m.percentage}, ${amount},
            ${m.dueDate ? `'${m.dueDate}'` : "NULL"}, ${reqDocs})
        `);
      }
    }

    return Response.json({ ok: true, receivable });
  } catch (e) {
    console.error("receivable create error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
