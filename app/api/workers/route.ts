import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
    return Response.json(workers);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, project, phone } = await req.json();
    if (!name || !project) {
      return Response.json({ error: "姓名和所属项目必填" }, { status: 400 });
    }
    const id = "W" + Date.now().toString(36).toUpperCase();
    const worker = await prisma.worker.create({
      data: { id, name, project, phone: phone ?? null },
    });
    return Response.json(worker, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: `创建失败：${msg}` }, { status: 500 });
  }
}
