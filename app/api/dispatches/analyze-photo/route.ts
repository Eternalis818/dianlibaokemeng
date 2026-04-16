import { NextRequest } from "next/server";
import { chatCompletion, ContentPart } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

/** POST /api/dispatches/analyze-photo — AI 识别工作票照片 */
export async function POST(req: NextRequest) {
  try {
    const { photoPath } = await req.json();
    if (!photoPath) return Response.json({ error: "缺少照片路径" }, { status: 400 });

    // 构造图片 URL（本地路径转为完整 URL）
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const imageUrl = photoPath.startsWith("http") ? photoPath : `${baseUrl}${photoPath}`;

    // 调用 LLM 多模态识别
    const systemPrompt = `你是 PowerLink OS 的电力施工工作票解析助手。
用户会发来一张工作票/派工单/施工单的照片，请从中提取以下信息并以 JSON 格式返回：
{
  "projectCode": "项目编码（如 HL-2024-001，无法识别则填 null）",
  "location": "施工地点（如 xx变电站xx线路，无法识别则填 null）",
  "startTime": "计划开始时间（ISO 8601格式，如 2024-03-15T08:00:00，无法识别则填 null）",
  "endTime": "计划结束时间（ISO 8601格式，无法识别则填 null）",
  "content": "工作内容描述（完整转写所有施工内容文字，无法识别则填 null）"
}
只返回 JSON，不要其他文字。如果照片不是工作票/派工单，返回 { "error": "无法识别工作票内容" }`;

    const userContent: ContentPart[] = [
      { type: "text", text: "请识别这张工作票照片，提取派工单信息。" },
      { type: "image_url", image_url: { url: imageUrl } },
    ];

    const result = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { maxTokens: 1000, temperature: 0.1 },
      "photo"
    );

    // 解析 LLM 返回的 JSON
    let parsed;
    try {
      // 尝试提取 JSON（LLM 可能返回带 markdown 的内容）
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ success: false, error: "AI 无法识别工作票内容" });
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ success: false, error: "AI 返回格式异常" });
    }

    if (parsed.error) {
      return Response.json({ success: false, error: parsed.error });
    }

    // 校验 projectCode 是否存在
    let projectCodeVerified = false;
    if (parsed.projectCode) {
      const project = await prisma.project.findFirst({ where: { code: parsed.projectCode } });
      projectCodeVerified = !!project;
    }

    return Response.json({
      success: true,
      data: {
        projectCode: parsed.projectCode || null,
        location: parsed.location || null,
        startTime: parsed.startTime || null,
        endTime: parsed.endTime || null,
        content: parsed.content || null,
      },
      projectCodeVerified,
    });
  } catch (e) {
    console.error("analyze-photo error:", e);
    return Response.json({ error: "AI 识别失败" }, { status: 500 });
  }
}
