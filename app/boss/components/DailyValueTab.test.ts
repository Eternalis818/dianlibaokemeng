import test from "node:test";
import assert from "node:assert/strict";

import { computeCostBreakdown, gradeMeta } from "./DailyValueTab";

test("computeCostBreakdown 应计算占比", () => {
  const list = computeCostBreakdown(620, 220, 160);
  assert.equal(list[0].label, "工资");
  assert.equal(list[0].percent, 62);
  assert.equal(list[1].percent, 22);
  assert.equal(list[2].percent, 16);
});

test("computeCostBreakdown 总成本为 0 时占比应为 0", () => {
  const list = computeCostBreakdown(0, 0, 0);
  assert.equal(list[0].percent, 0);
  assert.equal(list[1].percent, 0);
  assert.equal(list[2].percent, 0);
});

test("gradeMeta 应返回 warning 配色", () => {
  const meta = gradeMeta("warning");
  assert.equal(meta.label, "预警");
  assert.equal(meta.accent, "#f87171");
});
