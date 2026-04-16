import { NextRequest } from "next/server";
import { chatCompletion } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

/** POST /api/collection-ai — AI 催收助手 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, debtorType, debtorName, overdueDays, contractAmount, pendingAmount, customQuestion } = body;

    let systemPrompt = `你是 PowerLink OS 的催收顾问 AI，精通电力施工行业的收款策略和法律手段。
你的建议要具体、可操作、接地气。用中文回复。不要说废话，直接给策略。`;

    let userPrompt = "";

    if (action === "strategy" && debtorType) {
      // 推荐催收策略
      userPrompt = `债主类型：${debtorType}
${debtorName ? `债主名称：${debtorName}` : ""}
${overdueDays ? `逾期天数：${overdueDays}天` : ""}
${pendingAmount ? `待收金额：¥${pendingAmount}` : ""}

请给出针对这种类型债主的最佳催收策略，包括：
1. 当前阶段应该怎么做
2. 推荐的话术（给2-3句）
3. 注意事项
4. 下一步行动建议`;
    } else if (action === "letter") {
      // 生成催款函
      userPrompt = `请生成一份正式催款函，信息如下：
债主名称：${debtorName || "______公司"}
欠款金额：¥${pendingAmount || "______"}
逾期天数：${overdueDays || "______"}天
${contractAmount ? `合同总额：¥${contractAmount}` : ""}

要求：
1. 格式规范（标题、正文、落款）
2. 语气正式但有力度
3. 引用合同条款和法律规定
4. 给出明确的付款期限
5. 暗示法律后果但不过激`;
    } else if (action === "timing") {
      // 催收时机分析
      userPrompt = `当前日期：${new Date().toLocaleDateString("zh-CN")}
债主类型：${debtorType || "未指定"}
逾期天数：${overdueDays || "未指定"}天

请分析现在是催收的好时机吗？给出：
1. 当前时间节点的优势/劣势
2. 最佳催收时间窗口
3. 应该用什么方式催
4. 如果现在不催，什么时候催最好`;
    } else if (customQuestion) {
      // 自由问答
      userPrompt = customQuestion;
    } else {
      return Response.json({ error: "请指定 action 或 customQuestion" }, { status: 400 });
    }

    // 检索相关知识库作为上下文
    const knowledge = await prisma.$queryRawUnsafe<any[]>(
      `SELECT title, content FROM "CollectionKnowledge"
       WHERE "isEncrypted" = false AND (content ILIKE '%${debtorType || ""}%' OR tags ILIKE '%${debtorType || ""}%')
       LIMIT 3`
    ).catch(() => []);

    if (knowledge.length > 0) {
      const kbContext = knowledge.map((k: any) => `### ${k.title}\n${k.content}`).join("\n\n");
      systemPrompt += `\n\n参考知识库：\n${kbContext}`;
    }

    const result = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { maxTokens: 2000, temperature: 0.7 });

    return Response.json({ content: result });
  } catch (e) {
    console.error("collection AI error:", e);
    return Response.json({ error: "AI 服务暂时不可用" }, { status: 500 });
  }
}
