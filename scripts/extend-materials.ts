import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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

async function main() {
  console.log("Extending Material table...");

  // Add new columns
  const columns = [
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "spec" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'warehouse'`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "stockQty" DOUBLE PRECISION DEFAULT 0`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "minStock" DOUBLE PRECISION DEFAULT 0`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "warehouseLocation" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "hazardous" BOOLEAN DEFAULT false`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "supplier" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "agreementNo" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "pinyin" TEXT DEFAULT ''`,
    `ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "pinyinShort" TEXT DEFAULT ''`,
  ];

  for (const sql of columns) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("  OK:", sql.split("ADD COLUMN IF NOT EXISTS")[1]?.split("DEFAULT")[0]?.trim() || sql.slice(0, 60));
    } catch (e) {
      console.error("  SKIP:", (e as Error).message);
    }
  }

  // Create two default libraries
  const libs = await prisma.$queryRawUnsafe<{ id: number; name: string }[]>(`SELECT id, name FROM "MaterialLibrary"`);
  if (!libs.find((l) => l.name === "仓库库存")) {
    await prisma.$executeRawUnsafe(`INSERT INTO "MaterialLibrary" (name, "isActive", "createdAt") VALUES ('仓库库存', true, NOW())`);
    console.log("  Created library: 仓库库存");
  }
  if (!libs.find((l) => l.name === "协议库存")) {
    await prisma.$executeRawUnsafe(`INSERT INTO "MaterialLibrary" (name, "isActive", "createdAt") VALUES ('协议库存', true, NOW())`);
    console.log("  Created library: 协议库存");
  }

  // Add index for search performance
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Material_name_idx" ON "Material" (name)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Material_code_idx" ON "Material" (code)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Material_category_idx" ON "Material" (category)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Material_pinyinShort_idx" ON "Material" ("pinyinShort")`);
    console.log("  Indexes created");
  } catch (e) {
    console.error("  Index error:", (e as Error).message);
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
