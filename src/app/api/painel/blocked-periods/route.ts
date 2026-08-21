import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const blocks = await prisma.blockedPeriod.findMany({
      where: { businessId },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json({ blocks });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  businessId: z.string().min(1),
  professionalId: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    if (new Date(body.endAt) <= new Date(body.startAt)) {
      return NextResponse.json({ error: "O fim precisa ser depois do início." }, { status: 400 });
    }

    const block = await prisma.blockedPeriod.create({
      data: {
        businessId: body.businessId,
        professionalId: body.professionalId,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        reason: body.reason,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
