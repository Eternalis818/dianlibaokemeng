import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/materials — list materials with optional filters */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectCode = searchParams.get("project");
  const libraryId = searchParams.get("libraryId");
  const source = searchParams.get("source");
  const category = searchParams.get("category");
  const alert = searchParams.get("alert"); // "1" = low stock items

  const where: Record<string, unknown> = {};
  if (libraryId) where.libraryId = Number(libraryId);
  if (projectCode) where.library = { projectCode };
  if (source) where.source = source;
  if (category) where.category = category;

  const items = await prisma.material.findMany({
    where,
    include: { library: { select: { name: true, projectCode: true } } },
    orderBy: { code: "asc" },
  });

  if (alert === "1") {
    // Filter to items where stockQty < minStock and minStock > 0
    const lowStock = items.filter((m: any) => m.minStock > 0 && m.stockQty < m.minStock);
    return Response.json(lowStock);
  }

  return Response.json(items);
}

/** PATCH /api/materials — update material */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, usedQty, planQty, unitCost } = body;
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (usedQty !== undefined) data.usedQty = Number(usedQty);
  if (planQty !== undefined) data.planQty = Number(planQty);
  if (unitCost !== undefined) data.unitCost = Number(unitCost);

  const item = await prisma.material.update({
    where: { id: Number(id) },
    data,
  });
  return Response.json(item);
}

/** POST /api/materials — create material */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { libraryId, code, name, unit, planQty, unitCost, spec, category, source } = body;
  if (!libraryId || !code || !name || !unit) {
    return Response.json({ error: "libraryId, code, name, unit required" }, { status: 400 });
  }

  // Generate pinyin
  let pinyinFull = "";
  let pinyinShort = "";
  try {
    const { pinyin } = await import("pinyin-pro");
    pinyinFull = pinyin(name, { toneType: "none", type: "array" }).join("").toLowerCase();
    pinyinShort = pinyin(name, { pattern: "first", toneType: "none", type: "array" }).join("").toLowerCase();
  } catch { /* ignore */ }

  const item = await prisma.material.create({
    data: {
      libraryId: Number(libraryId),
      code, name, unit,
      spec: spec ?? "",
      category: category ?? "",
      source: source ?? "warehouse",
      planQty: planQty ? Number(planQty) : 0,
      usedQty: 0,
      unitCost: unitCost ? Number(unitCost) : 0,
      pinyin: pinyinFull,
      pinyinShort: pinyinShort,
    } as any,
  });
  return Response.json(item, { status: 201 });
}
