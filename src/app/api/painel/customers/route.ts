import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") ?? "";
    const search = searchParams.get("search")?.trim();
    await requireBusinessAccess(businessId);

    const customers = await prisma.customer.findMany({
      where: {
        businessId,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
      include: {
        appointments: {
          orderBy: { startAt: "desc" },
          take: 1,
          select: { startAt: true, status: true },
        },
        _count: { select: { appointments: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    return errorResponse(error);
  }
}
