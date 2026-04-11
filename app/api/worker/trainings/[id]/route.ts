import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const PASSING_SCORE = 80;

/** GET /api/worker/trainings/[id] — 获取培训详情+题目（不含答案） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const trainings = await prisma.$queryRawUnsafe<
      { id: number; title: string; content: string; version: number }[]
    >(`SELECT id, title, content, version FROM "SafetyTraining" WHERE id = ${parseInt(id)} AND "isActive" = true`);
    if (trainings.length === 0) return Response.json({ error: "培训不存在" }, { status: 404 });

    const questions = await prisma.$queryRawUnsafe<
      { id: number; question: string; optionA: string; optionB: string; optionC: string; optionD: string }[]
    >(`SELECT id, question, "optionA", "optionB", "optionC", "optionD" FROM "ExamQuestion" WHERE "trainingId" = ${parseInt(id)} ORDER BY id ASC`);

    return Response.json({ ...trainings[0], questions });
  } catch (e) {
    console.error("worker training GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/worker/trainings/[id] — 提交考试答案 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trainingId = parseInt(id);
  try {
    const workerId = req.headers.get("x-worker-id");
    if (!workerId) return Response.json({ error: "未登录" }, { status: 401 });

    const { answers } = await req.json(); // { [questionId]: "A" | "B" | "C" | "D" }
    if (!answers || typeof answers !== "object") {
      return Response.json({ error: "答案格式错误" }, { status: 400 });
    }

    // Get all questions with correct answers
    const questions = await prisma.$queryRawUnsafe<
      { id: number; correctAnswer: string }[]
    >(`SELECT id, "correctAnswer" FROM "ExamQuestion" WHERE "trainingId" = ${trainingId}`);

    if (questions.length === 0) {
      return Response.json({ error: "该培训暂无考试题目" }, { status: 400 });
    }

    // Calculate score
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctAnswer) correct++;
    }
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= PASSING_SCORE;

    // Calculate points to clear
    const workerRows = await prisma.$queryRawUnsafe<{ penaltyPoints: number }[]>(
      `SELECT "penaltyPoints" FROM "Worker" WHERE id = '${workerId}'`
    );
    const currentPenalty = Number(workerRows[0]?.penaltyPoints ?? 0);

    let pointsCleared = 0;
    if (passed) {
      // Score 100 → clear 100%, otherwise clear 50%
      pointsCleared = score === 100 ? currentPenalty : Math.floor(currentPenalty * 0.5);
    }

    // Save exam attempt
    const escapedAnswers = JSON.stringify(answers).replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ExamAttempt" ("workerId", "trainingId", answers, score, passed, "pointsCleared", "createdAt")
       VALUES ('${workerId}', ${trainingId}, '${escapedAnswers}'::jsonb, ${score}, ${passed}, ${pointsCleared}, NOW())`
    );

    // If passed, clear penalty points and potentially unlock
    if (passed && pointsCleared > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Worker" SET
          "penaltyPoints" = GREATEST("penaltyPoints" - ${pointsCleared}, 0),
          "isLocked" = CASE WHEN GREATEST("penaltyPoints" - ${pointsCleared}, 0) < 12 THEN false ELSE "isLocked" END
         WHERE id = '${workerId}'`
      );
    }

    return Response.json({
      ok: true,
      score,
      passed,
      correct,
      total: questions.length,
      pointsCleared: passed ? pointsCleared : 0,
      remainingPenalty: passed ? Math.max(currentPenalty - pointsCleared, 0) : currentPenalty,
      unlocked: passed && (currentPenalty - pointsCleared) < 12,
    });
  } catch (e) {
    console.error("exam submit error:", e);
    return Response.json({ error: "提交失败" }, { status: 500 });
  }
}
