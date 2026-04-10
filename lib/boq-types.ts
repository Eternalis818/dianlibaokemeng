/**
 * BOQ (Bill of Quantities) 清单计价类型定义
 * 兼容电力系统工程量清单计价模式，预留海迈/晨曦对接接口
 */

// ─── 清单计价条目 ────────────────────────────────────────────────────────────────
export interface BOQItem {
  /** 清单编码 (如 "010101001001") */
  code: string;
  /** 项目名称 (如 "电缆沟开挖") */
  name: string;
  /** 项目特征描述 (如 "普通土, 深度1.2m以内") */
  characteristics: string;
  /** 计量单位 (如 "m", "个", "组", "台") */
  unit: string;
  /** 工程数量 */
  quantity: number;
  /** 综合单价 (来自价格库匹配，未匹配时为 null) */
  unitPrice: number | null;
  /** 合价 = quantity × unitPrice */
  totalPrice: number | null;
  /** 匹配到的价格库条目 ID */
  priceItemId: number | null;
  /** 海迈软件编码 (预留) */
  haimaiCode?: string;
  /** 晨曦软件编码 (预留) */
  chenxiCode?: string;
}

// ─── 智能拆解结果 ────────────────────────────────────────────────────────────────
export interface SmartParseResult {
  /** 解析出的清单条目 */
  items: BOQItem[];
  /** AI 解析时的原始输入 */
  rawInput: string;
  /** 解析置信度 0-1 */
  confidence: number;
  /** 解析时间戳 */
  parsedAt: string;
  /** 是否需要人工确认 */
  needsReview: boolean;
}

// ─── 海迈/晨曦导出接口 (预留 Agent 对接) ──────────────────────────────────────────
export interface BOQExporter {
  /** 导出软件标识 */
  readonly provider: "haimai" | "chenxi" | string;
  /** 导出为软件可识别的格式 */
  export(items: BOQItem[], projectCode: string): Promise<ExportResult>;
  /** 验证数据格式是否兼容 */
  validate(items: BOQItem[]): ValidationResult;
}

export interface ExportResult {
  success: boolean;
  /** 导出的文件内容或数据 URL */
  data?: string;
  /** 导出格式描述 (如 "海迈 XML", "晨曦 Excel") */
  format?: string;
  /** 错误信息 */
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── 智能拆解服务接口 (预留 Agent 对接) ──────────────────────────────────────────
export interface SmartParseProvider {
  /** 服务标识 */
  readonly provider: "builtin-ai" | "haimai-agent" | "chenxi-agent" | string;
  /** 解析自然语言为清单条目 */
  parse(input: string, context?: ParseContext): Promise<SmartParseResult>;
}

export interface ParseContext {
  /** 项目编码 */
  projectCode?: string;
  /** 工人常用工序 (用于提高匹配精度) */
  frequentTasks?: string[];
  /** 已有价格库编码 (用于优先匹配) */
  knownCodes?: string[];
}

// ─── API 请求/响应类型 ───────────────────────────────────────────────────────────
export interface SmartParseRequest {
  input: string;
  projectCode?: string;
}

export interface SmartParseResponse {
  success: boolean;
  result?: SmartParseResult;
  error?: string;
}

// ─── 批量报量提交 (从拆解结果提交) ────────────────────────────────────────────────
export interface BatchReportItem {
  task: string;
  spec: string;
  qty: string;
  unitPrice?: number | null;
  totalPrice?: number | null;
  priceItemId?: number | null;
}
