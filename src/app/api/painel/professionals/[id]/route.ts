import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";
import type { Prisma } from "@/generated/prisma";

const updateSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  photoUrl: z.string().url().nullable().optional(),
  specialties: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  hours: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() }))
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    const existing = await prisma.professional.findFirst({ where: { id, businessId: body.businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }

    const { hours, businessId, ...data } = body;

    const ops: Prisma.PrismaPromise<unknown>[] = [prisma.professional.update({ where: { id }, data })];
    if (hours) {
      ops.push(prisma.professionalHours.deleteMany({ where: { professionalId: id } }));
      ops.push(
        prisma.professionalHours.createMany({
          data: hours.map((h) => ({ ...h, professionalId: id })),
        })
      );
    }
    const [professional] = await prisma.$transaction(ops);

    return NextResponse.json({ professional });
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
    await requireBusinessAccess(businessId, ["OWNER", "MANAGER"]);

    const existing = await prisma.professional.findFirst({ where: { id, businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }
    await prisma.professional.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
