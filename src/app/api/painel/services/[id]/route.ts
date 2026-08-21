import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";
import type { Prisma } from "@/generated/prisma";

const updateSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  durationMin: z.number().int().positive().max(600).optional(),
  bufferMin: z.number().int().nonnegative().max(240).optional(),
  active: z.boolean().optional(),
  professionalIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    const existing = await prisma.service.findFirst({ where: { id, businessId: body.businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const { professionalIds, businessId, ...data } = body;

    // Array montado antes e enviado como $transaction([...]) em lote (1 round-trip) —
    // o pooler não sustenta transaction interativa (ver nota em api/signup/route.ts).
    const ops: Prisma.PrismaPromise<unknown>[] = [prisma.service.update({ where: { id }, data })];
    if (professionalIds) {
      ops.push(prisma.serviceProfessional.deleteMany({ where: { serviceId: id } }));
      ops.push(
        prisma.serviceProfessional.createMany({
          data: professionalIds.map((professionalId) => ({ serviceId: id, professionalId })),
        })
      );
    }
    const [service] = await prisma.$transaction(ops);

    return NextResponse.json({ service });
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

    const existing = await prisma.service.findFirst({ where: { id, businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }
    // Soft: nunca apagar serviço com histórico de agendamento — só desativa.
    await prisma.service.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
