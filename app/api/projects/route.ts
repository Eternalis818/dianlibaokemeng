import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(projects);
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
