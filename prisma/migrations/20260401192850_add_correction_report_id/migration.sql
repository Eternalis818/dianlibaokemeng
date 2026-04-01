-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Correction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "corrected" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reportId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Correction_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Correction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Correction" ("corrected", "createdAt", "id", "original", "reason", "status", "workerId", "workerName") SELECT "corrected", "createdAt", "id", "original", "reason", "status", "workerId", "workerName" FROM "Correction";
DROP TABLE "Correction";
ALTER TABLE "new_Correction" RENAME TO "Correction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
