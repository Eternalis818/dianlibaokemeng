import test from "node:test";
import assert from "node:assert/strict";

import { computeDailyMetrics, evaluateDailyGrade, getShanghaiDayRange } from "./route";

test("getShanghaiDayRange 应返回上海时区当天边界", () => {
  const ref = new Date("2026-04-20T16:30:00.000Z"); // 上海时间 2026-04-21 00:30
  const range = getShanghaiDayRange(ref);

  assert.equal(range.date, "2026-04-21");
  assert.equal(range.start.toISOString(), "2026-04-20T16:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-04-21T16:00:00.000Z");
});

test("computeDailyMetrics 应计算产值成本盈亏与效率指标", () => {
  const now = new Date("2026-04-20T08:00:00.000Z");
  const metrics = computeDailyMetrics({
    date: "2026-04-20",
    reports: [
      { task: "基础开挖", project: "项目A", qty: "20m³", totalValue: 1000 },
      { task: "电缆敷设", project: "项目B", qty: "10m", totalValue: 500 },
    ],
    checkIns: [
      {
        workerId: "w1",
        createdAt: new Date("2026-04-20T06:00:00.000Z"),
        duration: 120,
        worker: { wageRate: 480 },
      },
      {
        workerId: "w2",
        createdAt: new Date("2026-04-20T07:00:00.000Z"),
        duration: null,
        worker: { wageRate: 240 },
      },
    ],
    projectExpenses: [{ amount: 200 }],
    expenseRows: [{ total: 100 }],
    historicalAveragePerWorkerOutput: 500,
    now,
  });

  assert.equal(metrics.outputValue, 1500);
  assert.equal(metrics.laborCost, 150);
  assert.equal(metrics.materialCost, 200);
  assert.equal(metrics.expenseCost, 100);
  assert.equal(metrics.totalCost, 450);
  assert.equal(metrics.pnl, 1050);
  assert.equal(metrics.pnlPercent, 70);
  assert.equal(metrics.workersOnsite, 2);
  assert.equal(metrics.totalManHours, 180);
  assert.equal(metrics.perWorkerOutput, 750);
  assert.equal(metrics.efficiencyRatio, 8.33);
  assert.equal(metrics.aiGrade, "excellent");
});

test("evaluateDailyGrade 应按规则返回等级", () => {
  assert.equal(evaluateDailyGrade({ pnl: -1, pnlPercent: -1, perWorkerOutput: 10, historicalAveragePerWorkerOutput: 9 }), "warning");
  assert.equal(evaluateDailyGrade({ pnl: 1, pnlPercent: 5, perWorkerOutput: 10, historicalAveragePerWorkerOutput: 9 }), "normal");
  assert.equal(evaluateDailyGrade({ pnl: 1, pnlPercent: 12, perWorkerOutput: 10, historicalAveragePerWorkerOutput: 9 }), "good");
  assert.equal(evaluateDailyGrade({ pnl: 1, pnlPercent: 35, perWorkerOutput: 10, historicalAveragePerWorkerOutput: 9 }), "excellent");
});
