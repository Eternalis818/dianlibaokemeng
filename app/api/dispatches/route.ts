import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/dispatches — 派工单列表 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectCode = searchParams.get("projectCode");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (projectCode) where.projectCode = projectCode;

    const dispatches = await prisma.dispatch.findMany({
      where,
      include: {
        workers: {
          include: { worker: { select: { id: true, name: true, phone: true, project: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(dispatches);
  } catch (e) {
    console.error("dispatches GET error:", e);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/dispatches — 创建派工单 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectCode, location, content, startTime, endTime, photoPath, status, workers } = body;

    if (!content?.trim()) return Response.json({ error: "派工内容不能为空" }, { status: 400 });

    const dispatchData: {
      projectCode: string | null;
      location: string | null;
      content: string;
      startTime: Date | null;
      endTime: Date | null;
      photoPath: string | null;
      status: string;
      workers?: { create: { workerId: string; role: string | null }[] };
    } = {
      projectCode: projectCode?.trim() || null,
      location: location?.trim() || null,
      content: content.trim(),
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      photoPath: photoPath || null,
      status: status || "draft",
    };

    // 工人列表
    if (workers?.length) {
      dispatchData.workers = {
        create: workers.map((w: { workerId: string; role?: string }) => ({
          workerId: w.workerId,
          role: w.role || null,
        })),
      };
    }

    const dispatch = await prisma.dispatch.create({
      data: dispatchData,
      include: {
        workers: {
          include: { worker: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    // 如果直接发送，创建站内通知
    if (dispatch.status === "sent" && workers?.length) {
      await prisma.dispatchNotification.createMany({
        data: workers.map((w: { workerId: string }) => ({
          workerId: w.workerId,
          dispatchId: dispatch.id,
          type: "dispatch",
        })),
        skipDuplicates: true,
      });
      // TODO: SMS notification — 需要短信服务商配置后启用
    }

    return Response.json(dispatch, { status: 201 });
  } catch (e) {
    console.error("dispatches POST error:", e);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
