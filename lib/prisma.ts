import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Use Supabase pooler with SSL via node-postgres (Prisma Rust engine can't go through proxy)
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
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
