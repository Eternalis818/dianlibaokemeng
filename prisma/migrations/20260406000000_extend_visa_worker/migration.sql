-- Extend Visa model: add new fields for real-world visa documents
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "serialNo"       TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "type"           TEXT NOT NULL DEFAULT 'quantity';
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "projectCode"    TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "reason"         TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "items"          JSONB;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "daysExtended"   INTEGER;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "periodReason"   TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "contractorSign" TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "supervisorSign" TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "builderSign"    TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "ownerSign"      TEXT;
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "attachments"    TEXT[] NOT NULL DEFAULT '{}';

-- Remove hardcoded default from project column
ALTER TABLE "Visa" ALTER COLUMN "project" DROP DEFAULT;
ALTER TABLE "Visa" ALTER COLUMN "amount" SET DEFAULT 0;

-- Extend Worker model: add identity, wage, and login fields
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "idCard"        TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "insuranceInfo" JSONB;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "wageType"      TEXT;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "wageRate"      DOUBLE PRECISION;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "loginPin"      TEXT;
