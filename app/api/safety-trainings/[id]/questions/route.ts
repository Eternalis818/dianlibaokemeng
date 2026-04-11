import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/safety-trainings/[id]/questions — 获取培训的考试题目 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: number; question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }[]
    >(`SELECT id, question, "optionA", "optionB", "optionC", "optionD", "correctAnswer" FROM "ExamQuestion" WHERE "trainingId" = ${parseInt(id)} ORDER BY id ASC`);
    // Hide correct answers for worker-facing API
    return Response.json(rows.map(({ correctAnswer, ...q }) => q));
  } catch (e) {
    console.error("questions GET error:", e);
    return Response.json([]);
  }
}

/** POST /api/safety-trainings/[id]/questions — 新增题目 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { question, optionA, optionB, optionC, optionD, correctAnswer } = await req.json();
    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
      return Response.json({ error: "所有字段必填" }, { status: 400 });
    }
    const escapedQ = question.replace(/'/g, "''");
    const escA = optionA.replace(/'/g, "''");
    const escB = optionB.replace(/'/g, "''");
    const escC = optionC.replace(/'/g, "''");
    const escD = optionD.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ExamQuestion" ("trainingId", question, "optionA", "optionB", "optionC", "optionD", "correctAnswer", "createdAt")
       VALUES (${parseInt(id)}, '${escapedQ}', '${escA}', '${escB}', '${escC}', '${escD}', '${correctAnswer}', NOW())`
    );
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("questions POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
