import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

const updateSchema = z.object({
  businessId: z.string().min(1),
  professionalId: z.string().nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  reason: z.string().max(200).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    const existing = await prisma.blockedPeriod.findFirst({ where: { id, businessId: body.businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Bloqueio não encontrado." }, { status: 404 });
    }

    const nextStart = body.startAt ? new Date(body.startAt) : existing.startAt;
    const nextEnd = body.endAt ? new Date(body.endAt) : existing.endAt;
    if (nextEnd <= nextStart) {
      return NextResponse.json({ error: "O fim precisa ser depois do início." }, { status: 400 });
    }

    const { businessId, ...data } = body;
    const block = await prisma.blockedPeriod.update({
      where: { id },
      data: {
        ...data,
        startAt: nextStart,
        endAt: nextEnd,
      },
    });

    return NextResponse.json({ block });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    const existing = await prisma.blockedPeriod.findFirst({ where: { id, businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Bloqueio não encontrado." }, { status: 404 });
    }
    await prisma.blockedPeriod.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
