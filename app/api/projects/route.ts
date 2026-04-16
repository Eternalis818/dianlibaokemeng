import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, budget, profitRate, status, centerLat, centerLng, geoRadius, contractAmount, advancePaymentRatio } = body;
    if (!name || !code) {
      return NextResponse.json({ error: "项目名称和编号必填" }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        code: code.trim(),
        budget: budget ? Number(budget) : 0,
        profitRate: profitRate ? Number(profitRate) : 0,
        status: status ?? "active",
        centerLat: centerLat ? Number(centerLat) : null,
        centerLng: centerLng ? Number(centerLng) : null,
        geoRadius: geoRadius ? Number(geoRadius) : 300,
        contractAmount: contractAmount ? Number(contractAmount) : 0,
        advancePaymentRatio: advancePaymentRatio ? Number(advancePaymentRatio) : 0,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "项目名称或编号已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "创建失败，请重试" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const project = await prisma.project.update({ where: { id: Number(id) }, data });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.project.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除失败，该项目可能存在关联数据" }, { status: 500 });
  }
}
