import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/llm";
import type { BOQItem, SmartParseResult } from "@/lib/boq-types";

/**
 * POST /api/worker/smart-parse
 * 一句话智能拆解为清单计价条目
 *
 * 预留接口：可将 AI provider 替换为海迈/晨曦 Agent
 */

const SYSTEM_PROMPT = `你是电力系统施工清单计价专家。任务：将工人的一句话描述拆解为标准工程量清单条目。

拆解规则：
1. 识别句子中所有独立的施工工序（如：电缆敷设、电缆沟开挖、做头、接地安装、配电箱安装等）
2. 每个工序提取：项目名称、规格/型号、数量、计量单位
3. 使用电力系统工程量清单计价规范的标准项目名称
4. 行话转换：做头→电缆终端头制作安装、放缆→电缆敷设、开挖→沟槽开挖、穿管→保护管敷设
5. 自动补全计量单位：100m电缆→单位"m"数量100，2个终端头→单位"个"数量2
6. 如无法确定规格，characteristics 留空由人工补充

输出严格 JSON 数组格式（不要加 markdown 代码块标记）：
[
  {
    "code": "清单编码(按电力定额格式，如无法确定填空字符串)",
    "name": "标准项目名称",
    "characteristics": "项目特征描述(含规格型号)",
    "unit": "计量单位",
    "quantity": 数值,
    "haimaiCode": "海迈编码(预留，如无法确定填空字符串)",
    "chenxiCode": "晨曦编码(预留，如无法确定填空字符串)"
  }
]

只输出 JSON 数组，不要输出任何其他文字。如果输入与施工无关或无法解析，输出空数组 []`;

export async function POST(req: NextRequest) {
  // 限流：15 次/分钟
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 15, 60_000)) {
    return Response.json({ success: false, error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const input: string = body.input?.trim();
    const projectCode: string | undefined = body.projectCode;

    if (!input || input.length < 2) {
      return Response.json({ success: false, error: "请输入施工描述" }, { status: 400 });
    }

    // ── 调用 AI 解析 ──────────────────────────────────────────────────────────
    let aiContent: string;
    try {
      aiContent = await chatCompletion(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
        { maxTokens: 1500, temperature: 0.3 },
        "default" // 智能拆解用默认模型
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("Smart-parse AI error:", msg);
      return Response.json({ success: false, error: `AI 服务异常：${msg}` }, { status: 200 });
    }

    // ── 解析 AI 输出 ─────────────────────────────────────────────────────────
    let parsedItems: Array<{
      code?: string;
      name?: string;
      characteristics?: string;
      unit?: string;
      quantity?: number;
      haimaiCode?: string;
      chenxiCode?: string;
    }> = [];

    try {
      // 尝试提取 JSON（AI 可能在 JSON 外面包了 markdown 代码块）
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedItems = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Smart-parse JSON parse error:", aiContent);
      return Response.json({
        success: false,
        error: "AI 返回格式异常，请重新描述",
      });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return Response.json({
        success: false,
        error: "无法从描述中识别施工内容，请更详细地描述",
      });
    }

    // ── 匹配价格库（失败不阻断） ─────────────────────────────────────────────────
    let priceCandidates: Awaited<ReturnType<typeof prisma.priceItem.findMany>> = [];
    try {
      priceCandidates = projectCode
        ? await prisma.priceItem.findMany({
            where: {
              library: {
                isActive: true,
                OR: [{ projectCode }, { projectCode: null }],
              },
            },
          })
        : await prisma.priceItem.findMany({
            where: { library: { isActive: true, projectCode: null } },
          });
    } catch {
      // 数据库不可用时跳过价格匹配
    }

    const boqItems: BOQItem[] = parsedItems.map((item) => {
      // 尝试匹配价格库
      let matchedPrice: number | null = null;
      let matchedId: number | null = null;

      if (priceCandidates.length > 0 && item.name) {
        const needle = `${item.name} ${item.characteristics ?? ""}`.toLowerCase();
        let bestScore = 0;

        for (const candidate of priceCandidates) {
          let score = 0;
          const haystack =
            `${candidate.name} ${candidate.code} ${(candidate.keywords ?? []).join(" ")} ${candidate.spec ?? ""}`.toLowerCase();
          for (const word of needle.split(/\s+/).filter(Boolean)) {
            if (haystack.includes(word)) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            matchedPrice = candidate.unitPrice;
            matchedId = candidate.id;
          }
        }
      }

      const quantity = typeof item.quantity === "number" ? item.quantity : 0;
      return {
        code: item.code ?? "",
        name: item.name ?? "",
        characteristics: item.characteristics ?? "",
        unit: item.unit ?? "项",
        quantity,
        unitPrice: matchedPrice,
        totalPrice:
          matchedPrice !== null && quantity > 0
            ? Math.round(quantity * matchedPrice * 100) / 100
            : null,
        priceItemId: matchedId,
        haimaiCode: item.haimaiCode ?? "",
        chenxiCode: item.chenxiCode ?? "",
      };
    });

    const result: SmartParseResult = {
      items: boqItems,
      rawInput: input,
      confidence: boqItems.every((i) => i.name && i.quantity > 0) ? 0.9 : 0.6,
      parsedAt: new Date().toISOString(),
      needsReview: boqItems.some((i) => !i.name || i.quantity <= 0),
    };

    return Response.json({ success: true, result });
  } catch (e) {
    console.error("smart-parse error:", e);
    return Response.json({ success: false, error: "解析失败，请重试" }, { status: 200 });
  }
}
