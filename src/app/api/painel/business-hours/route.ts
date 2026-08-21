import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);
    const hours = await prisma.businessHours.findMany({
      where: { businessId },
      orderBy: { weekday: "asc" },
    });
    return NextResponse.json({ hours });
  } catch (error) {
    return errorResponse(error);
  }
}

const putSchema = z.object({
  businessId: z.string().min(1),
  hours: z.array(
    z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() })
  ),
});

// Substitui o horário de funcionamento inteiro do negócio (um PUT idempotente é
// mais simples de operar no painel do que PATCH incremental por dia).
export async function PUT(req: NextRequest) {
  try {
    const body = putSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    await prisma.$transaction([
      prisma.businessHours.deleteMany({ where: { businessId: body.businessId } }),
      prisma.businessHours.createMany({
        data: body.hours.map((h) => ({ ...h, businessId: body.businessId })),
      }),
    ]);

    const hours = await prisma.businessHours.findMany({
      where: { businessId: body.businessId },
      orderBy: { weekday: "asc" },
    });
    return NextResponse.json({ hours });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
