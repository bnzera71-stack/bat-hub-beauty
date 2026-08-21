import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { emitAppointmentEvent } from "@/lib/events";
import { errorResponse } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  start: z.string().datetime(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email().optional().or(z.literal("")),
  note: z.string().max(500).optional(),
});

function isConflictError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("no_overlapping_appointments") || message.includes("exclusion constraint");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`appointment:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Espera um pouco e tenta de novo." },
        { status: 429 }
      );
    }

    const body = bodySchema.parse(await req.json());

    const business = await prisma.business.findUnique({ where: { slug: body.slug } });
    if (!business || business.status !== "ACTIVE") {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const service = await prisma.service.findFirst({
      where: { id: body.serviceId, businessId: business.id, active: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const startAt = new Date(body.start);
    const endAt = addMinutes(startAt, service.durationMin);

    // Revalida contra o motor de disponibilidade — a garantia final contra corrida
    // é o exclusion constraint no INSERT logo abaixo.
    const dayStart = new Date(startAt);
    dayStart.setHours(0, 0, 0, 0);
    const slots = await getAvailableSlots({
      businessId: business.id,
      serviceId: service.id,
      date: dayStart,
      professionalId: body.professionalId,
    });
    const stillAvailable = slots.some((s) => s.start.getTime() === startAt.getTime());
    if (!stillAvailable) {
      return NextResponse.json(
        { error: "Esse horário não está mais disponível. Escolha outro." },
        { status: 409 }
      );
    }

    const status = business.confirmationMode === "AUTOMATIC" ? "CONFIRMED" : "PENDING";

    // Upsert do cliente roda fora do $transaction em lote (não dá pra saber o id
    // gerado de antemão quando ele já existe). O pooler não sustenta transaction
    // interativa, então o resto vira um $transaction([...]) de um round-trip só.
    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone: body.customerPhone } },
      update: { name: body.customerName, email: body.customerEmail || undefined },
      create: {
        businessId: business.id,
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || undefined,
      },
    });

    const appointmentId = crypto.randomUUID();
    const [appointment] = await prisma.$transaction([
      prisma.appointment.create({
        data: {
          id: appointmentId,
          businessId: business.id,
          customerId: customer.id,
          professionalId: body.professionalId,
          serviceId: service.id,
          startAt,
          endAt,
          status,
          source: "PUBLIC",
          note: body.note,
        },
      }),
      prisma.appointmentStatusHistory.create({
        data: { appointmentId, status, changedBy: null },
      }),
    ]);

    await emitAppointmentEvent("appointment.created", business.id, {
      appointmentId: appointment.id,
      startAt: appointment.startAt,
      customerName: body.customerName,
      serviceName: service.name,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    if (isConflictError(error)) {
      return NextResponse.json(
        { error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." },
        { status: 409 }
      );
    }
    return errorResponse(error);
  }
}
