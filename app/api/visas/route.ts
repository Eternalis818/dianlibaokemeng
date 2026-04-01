import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");

  const visas = await prisma.visa.findMany({
    where: project ? { project } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(visas);
}

export async function POST(req: NextRequest) {
  const { title, amount, submitter, project } = await req.json();
  const visa = await prisma.visa.create({
    data: { title, amount: Number(amount), submitter, project: project ?? "汇龙配电所改造" },
  });
  return Response.json(visa);
}
