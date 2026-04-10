import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { chatCompletion } from "@/lib/llm";

/**
 * POST /api/worker/photo-review
 * 施工照片 AI 复核接口
 *
 * 功能：
 * 1. 接收照片描述（base64 或 URL）+ 报量数据
 * 2. AI 分析照片内容，与报量数据对比
 * 3. 输出复核意见：匹配度、差异、建议补充项
 *
 * 预留接口：可对接专业视觉 Agent（海迈/晨曦 OCR、工程量识别等）
 */

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!rateLimit(ip, 10, 60_000)) {
    return Response.json({ success: false, error: "请求过于频繁" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const reportItems: Array<{ task: string; spec: string; qty: string }> = body.reportItems ?? [];
    const photoDescription: string = body.photoDescription ?? "";

    if (!photoDescription && reportItems.length === 0) {
      return Response.json({ success: false, error: "缺少报量数据或照片描述" }, { status: 400 });
    }

    // ── 阶段 1：基于文本的报量合理性检查 ────────────────────────────────────
    // 未来阶段 2：接入多模态模型直接分析照片
    // 未来阶段 3：对接海迈/晨曦 OCR 识别工程量

    const reportSummary = reportItems
      .map((r, i) => `${i + 1}. 工序: ${r.task} | 规格: ${r.spec} | 数量: ${r.qty}`)
      .join("\n");

    const REVIEW_PROMPT = `你是电力系统施工质检专家，负责复核工人的报量记录。

报量数据：
${reportSummary}
${photoDescription ? `\n现场照片描述：${photoDescription}` : ""}

请从以下维度复核：

1. **数据合理性**：工序与规格是否匹配？数量是否在正常施工范围内？
2. **完整性检查**：是否有遗漏的关联工序？（如：电缆敷设后是否漏报了电缆头制作）
3. **单位一致性**：计量单位是否正确？（如：电缆应报"m"而非"km"）
4. **规格校验**：规格型号是否完整？是否缺少电压等级、截面等关键参数？

输出严格 JSON 格式（不要加 markdown 标记）：
{
  "overallScore": 0-100,
  "status": "pass" | "warning" | "reject",
  "checks": [
    {
      "item": "检查项名称",
      "result": "pass" | "warning" | "fail",
      "detail": "具体说明"
    }
  ],
  "suggestions": ["建议补充的报量项1", "建议补充的报量项2"],
  "missingItems": [
    { "task": "遗漏工序名", "reason": "推荐原因" }
  ]
}

只输出 JSON，不要输出其他文字。`;

    let aiContent: string;
    try {
      aiContent = await chatCompletion(
        [{ role: "user", content: REVIEW_PROMPT }],
        { maxTokens: 1200, temperature: 0.2 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      return Response.json({ success: false, error: `AI 复核失败：${msg}` }, { status: 200 });
    }

    // 解析 AI 输出
    let reviewResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reviewResult = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // JSON 解析失败，返回原始文本
    }

    if (!reviewResult) {
      return Response.json({
        success: true,
        result: {
          overallScore: 0,
          status: "warning",
          checks: [],
          suggestions: [],
          missingItems: [],
          rawReview: aiContent,
        },
      });
    }

    return Response.json({ success: true, result: reviewResult });
  } catch (e) {
    console.error("photo-review error:", e);
    return Response.json({ success: false, error: "复核失败，请重试" }, { status: 200 });
  }
}
