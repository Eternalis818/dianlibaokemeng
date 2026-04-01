import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  return Response.json(workers);
}
