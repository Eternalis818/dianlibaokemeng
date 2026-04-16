import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/contract-payments?projectId=1 — 获取项目的合同款项节点列表 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId 必填" }, { status: 400 });
    }
    const payments = await prisma.contractPayment.findMany({
      where: { projectId: Number(projectId) },
      orderBy: { expectedDate: "asc" },
    });
    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/contract-payments — 新增款项节点 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, nodeName, amount, receivedAmount, status, expectedDate, note } = body;
    if (!projectId || !nodeName || amount === undefined) {
      return NextResponse.json({ error: "projectId、节点名称和金额必填" }, { status: 400 });
    }
    const payment = await prisma.contractPayment.create({
      data: {
        projectId: Number(projectId),
        nodeName: nodeName.trim(),
        amount: Number(amount),
        receivedAmount: receivedAmount ? Number(receivedAmount) : 0,
        status: status ?? "pending",
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        note: note ?? null,
      },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

/** PATCH /api/contract-payments — 更新款项节点 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });

    // 日期字段转换
    const updateData: Record<string, unknown> = { ...data };
    if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
    if (data.actualDate !== undefined) updateData.actualDate = data.actualDate ? new Date(data.actualDate) : null;
    if (data.amount !== undefined) updateData.amount = Number(data.amount);
    if (data.receivedAmount !== undefined) updateData.receivedAmount = Number(data.receivedAmount);

    const payment = await prisma.contractPayment.update({
      where: { id: Number(id) },
      data: updateData,
    });
    return NextResponse.json(payment);
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE /api/contract-payments?id=1 — 删除款项节点 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
    await prisma.contractPayment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
