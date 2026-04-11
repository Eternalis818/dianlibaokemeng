import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as XLSX from "xlsx";
import { pinyin } from "pinyin-pro";

const pool = new pg.Pool({
  host: "aws-1-ap-southeast-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.gzqazdrtkbspzrtvcsyb",
  password: "Aawoaini2012@",
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

// Category mapping by code prefix
function getCategory(code: string): string {
  const prefix = code.slice(0, 2).toUpperCase();
  const sub = code.slice(2, 3);
  const map: Record<string, string> = {
    "0S": "设备/金具/材料",
    "0M": "线缆/母线/导线",
    "0G": "五金/附件/铁件",
    "0E": "电气设备",
    "1S": "工器具",
    "BG": "备品/安全/劳保",
  };
  const subMap: Record<string, string> = {
    "0S0": "金具", "0S1": "绝缘子", "0S2": "避雷器", "0S3": "变压器配件",
    "0S4": "开关柜配件", "0S5": "电缆附件", "0S6": "电杆/铁塔",
    "0S7": "金具铁件", "0S8": "线路金具", "0S9": "其他材料",
    "0M1": "电力电缆", "0M2": "控制电缆", "0M3": "母线/铜排",
    "0M4": "架空导线", "0M5": "绝缘导线", "0M6": "光缆/通信线",
    "0G0": "五金件", "0G1": "紧固件", "0G2": "铁附件", "0G3": "管道/管件",
    "0E0": "配电设备", "0E1": "变压器", "0E2": "开关柜",
    "0E3": "箱式变电站", "0E4": "互感器", "0E5": "电容器",
  };
  const key = prefix + sub;
  return subMap[key] || map[prefix] || "其他";
}

function getPinyin(text: string): { full: string; short: string } {
  try {
    const full = pinyin(text, { toneType: "none", type: "array" }).join("");
    const short = pinyin(text, { pattern: "first", toneType: "none", type: "array" }).join("").toLowerCase();
    return { full: full.toLowerCase(), short };
  } catch {
    return { full: "", short: "" };
  }
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/'/g, "''").trim();
}

async function importWarehouse(libId: number) {
  console.log("\n=== Importing warehouse inventory (goodsno.xlsx) ===");
  const wb = XLSX.readFile("goodsno.xlsx");
  const ws = wb.Sheets[wb.SheetNames[0]];
  // Header row is merged cells - skip it by using range starting from row 2
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 });
  // rawRows[0] is the header: [序号, 物品编码, 物品名称, 规格型号, 单位, 危化品, ...]
  const header: string[] = rawRows[0];
  const dataRows = rawRows.slice(1);
  const rows = dataRows.map((r: any[]) => {
    const obj: any = {};
    header.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  });

  console.log(`Total rows: ${rows.length}`);
  console.log(`Sample: code=${rows[0]?.["物品编码"]}, name=${rows[0]?.["物品名称"]}`);

  let imported = 0;
  const batchSize = 200;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map((r: any) => {
      const code = esc(r["物品编码"]);
      const name = esc(r["物品名称"]);
      if (!code || !name) return null;
      const spec = esc(r["规格型号"]);
      const unit = esc(r["单位"]) || "个";
      const category = getCategory(code);
      const stockQty = parseFloat(r["可用数"] ?? r["结存数"] ?? 0) || 0;
      const minStock = parseFloat(r["库存下限"] ?? 0) || 0;
      const unitCost = parseFloat(r["单价"] ?? 0) || 0;
      const location = esc(r["货仓位"]);
      const hazardous = String(r["危化品"] ?? "") === "是";
      const { full, short } = getPinyin(name);
      return `(${libId}, '${code}', '${name.replace(/'/g, "''")}', '${unit}', '${spec.replace(/'/g, "''")}', '${category}', 'warehouse', 0, 0, ${stockQty}, ${minStock}, ${unitCost}, '${location.replace(/'/g, "''")}', ${hazardous}, '', '', NULL, '${full}', '${short}')`;
    }).filter(Boolean);

    if (values.length === 0) continue;

    const sql = `INSERT INTO "Material" ("libraryId", code, name, unit, spec, category, source, "planQty", "usedQty", "stockQty", "minStock", "unitCost", "warehouseLocation", hazardous, supplier, "agreementNo", "validUntil", pinyin, "pinyinShort") VALUES ${values.join(", ")}`;
    try {
      await prisma.$executeRawUnsafe(sql);
      imported += values.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: +${values.length} (total: ${imported})`);
    } catch (e) {
      console.error(`  Batch error at row ${i}:`, (e as Error).message?.slice(0, 120));
    }
  }
  console.log(`Warehouse import done: ${imported} items`);
}

async function importAgreement(libId: number) {
  console.log("\n=== Importing agreement inventory (goodsno2.xls) ===");
  const wb = XLSX.readFile("goodsno2.xls");
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  console.log(`Total rows: ${rows.length}`);

  // Deduplicate by material code (物料号) - keep the one with highest price
  const uniqueMap = new Map<string, any>();
  for (const r of rows as any[]) {
    const code = esc(r["物料号"]);
    if (!code) continue;
    const existing = uniqueMap.get(code);
    const price = parseFloat(r["不含税单价"] ?? 0) || 0;
    if (!existing || price > (parseFloat(existing["不含税单价"] ?? 0) || 0)) {
      uniqueMap.set(code, r);
    }
  }
  const unique = Array.from(uniqueMap.values());
  console.log(`Unique materials: ${unique.length}`);

  let imported = 0;
  const batchSize = 100;

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const values = batch.map((r: any) => {
      const code = esc(r["物料号"]);
      const name = esc(r["物料描述"]);
      if (!code || !name) return null;
      const supplier = esc(r["供应商名称"]);
      const agreementNo = esc(r["协议库存号"]);
      const unitCost = parseFloat(r["不含税单价"] ?? 0) || 0;
      const validUntil = r["协议有效截止日期"] ? `'${new Date(r["协议有效截止日期"]).toISOString()}'` : "NULL";
      const category = esc(r["分标信息"]) || "协议物资";
      const { full, short } = getPinyin(name);
      return `(${libId}, '${code}', '${name.slice(0, 200).replace(/'/g, "''")}', '个', '', '${category.slice(0, 50).replace(/'/g, "''")}', 'agreement', 0, 0, 0, 0, ${unitCost}, '', false, '${supplier.slice(0, 100).replace(/'/g, "''")}', '${agreementNo}', ${validUntil}, '${full}', '${short}')`;
    }).filter(Boolean);

    if (values.length === 0) continue;

    const sql = `INSERT INTO "Material" ("libraryId", code, name, unit, spec, category, source, "planQty", "usedQty", "stockQty", "minStock", "unitCost", "warehouseLocation", hazardous, supplier, "agreementNo", "validUntil", pinyin, "pinyinShort") VALUES ${values.join(", ")}`;
    try {
      await prisma.$executeRawUnsafe(sql);
      imported += values.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: +${values.length} (total: ${imported})`);
    } catch (e) {
      console.error(`  Batch error at row ${i}:`, (e as Error).message?.slice(0, 120));
    }
  }
  console.log(`Agreement import done: ${imported} items`);
}

async function main() {
  // Get library IDs
  const libs = await prisma.$queryRawUnsafe<{ id: number; name: string }[]>(
    `SELECT id, name FROM "MaterialLibrary" WHERE name IN ('仓库库存', '协议库存') ORDER BY name`
  );
  const warehouseLib = libs.find((l) => l.name === "仓库库存");
  const agreementLib = libs.find((l) => l.name === "协议库存");

  if (!warehouseLib || !agreementLib) {
    console.error("Libraries not found!");
    process.exit(1);
  }

  // Clear existing data in these libraries
  await prisma.$executeRawUnsafe(`DELETE FROM "Material" WHERE "libraryId" IN (${warehouseLib.id}, ${agreementLib.id})`);
  console.log("Cleared existing materials");

  await importWarehouse(warehouseLib.id);
  await importAgreement(agreementLib.id);

  const total = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*) FROM "Material" WHERE "libraryId" IN (${warehouseLib.id}, ${agreementLib.id})`
  );
  console.log(`\nTotal materials in database: ${total[0].count}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
