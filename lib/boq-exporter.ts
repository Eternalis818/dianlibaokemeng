/**
 * BOQ 导出器抽象实现
 * 预留海迈/晨曦专业计量软件对接接口
 *
 * TODO: 对接海迈 Agent / 晨曦 Agent 时，实现对应的 Exporter 即可
 */

import type { BOQExporter, BOQItem, ExportResult, ValidationResult } from "./boq-types";

// ─── 基础导出器 (抽象骨架) ────────────────────────────────────────────────────────
abstract class BaseExporter implements BOQExporter {
  abstract readonly provider: string;

  abstract export(items: BOQItem[], projectCode: string): Promise<ExportResult>;

  validate(items: BOQItem[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name) errors.push(`第 ${i + 1} 项：项目名称不能为空`);
      if (!item.unit) errors.push(`第 ${i + 1} 项：计量单位不能为空`);
      if (item.quantity <= 0) errors.push(`第 ${i + 1} 项：工程数量必须大于 0`);
      if (item.unitPrice !== null && item.unitPrice < 0) {
        warnings.push(`第 ${i + 1} 项 ${item.name}：单价为负值`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ─── 海迈导出器 (预留) ────────────────────────────────────────────────────────────
export class HaimaiExporter extends BaseExporter {
  readonly provider = "haimai";

  async export(items: BOQItem[], projectCode: string): Promise<ExportResult> {
    // TODO: 实现海迈格式导出
    // 海迈软件通常使用 XML 或自定义二进制格式
    // 对接时需要参考海迈 SDK 或 API 文档
    return {
      success: false,
      error: "海迈导出功能尚未实现，请等待后续 Agent 对接",
    };
  }
}

// ─── 晨曦导出器 (预留) ────────────────────────────────────────────────────────────
export class ChenxiExporter extends BaseExporter {
  readonly provider = "chenxi";

  async export(items: BOQItem[], projectCode: string): Promise<ExportResult> {
    // TODO: 实现晨曦格式导出
    // 晨曦软件通常支持 Excel 导入/导出
    // 对接时需要参考晨曦数据接口规范
    return {
      success: false,
      error: "晨曦导出功能尚未实现，请等待后续 Agent 对接",
    };
  }
}

// ─── JSON 通用导出 (开发/测试用) ──────────────────────────────────────────────────
export class JsonExporter extends BaseExporter {
  readonly provider = "json";

  async export(items: BOQItem[], projectCode: string): Promise<ExportResult> {
    const validation = this.validate(items);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join("; ") };
    }

    const data = JSON.stringify(
      {
        projectCode,
        exportTime: new Date().toISOString(),
        items: items.map((item) => ({
          code: item.code,
          name: item.name,
          characteristics: item.characteristics,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      },
      null,
      2,
    );

    return { success: true, data, format: "JSON" };
  }
}

// ─── 导出器工厂 ────────────────────────────────────────────────────────────────────
const exporters = new Map<string, () => BOQExporter>([
  ["haimai", () => new HaimaiExporter()],
  ["chenxi", () => new ChenxiExporter()],
  ["json", () => new JsonExporter()],
]);

export function getExporter(provider: string): BOQExporter | null {
  const factory = exporters.get(provider);
  return factory ? factory() : null;
}

export function registerExporter(provider: string, factory: () => BOQExporter): void {
  exporters.set(provider, factory);
}
