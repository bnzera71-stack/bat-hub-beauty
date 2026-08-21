import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { businessId, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return errorResponse(error);
  }
}
