import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const project = searchParams.get("project");
    const visas = await prisma.visa.findMany({
      where: project ? { project } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return Response.json(visas);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, amount, submitter, project } = await req.json();
    if (!title || !submitter || !project) {
      return Response.json({ error: "标题、提交人、项目均为必填" }, { status: 400 });
    }
    const visa = await prisma.visa.create({
      data: { title, amount: Number(amount) || 0, submitter, project },
    });
    return Response.json(visa, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "创建失败" }, { status: 500 });
  }
}
