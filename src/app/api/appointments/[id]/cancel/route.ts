import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { emitAppointmentEvent } from "@/lib/events";
import { errorResponse } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  phone: z.string().min(8).max(20),
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

// Rota pública sem login — autorização é o telefone bater com o dono do
// agendamento (mesma identidade usada pra criar), não é o id sozinho (esse é só
// não-adivinhável, não é secreto por design — ver reminder-subscribe/route.ts).
// Cancelar tem blast radius bem maior que só assinar push, por isso a checagem extra.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`appointment-cancel:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas tentativas. Espera um pouco e tenta de novo." }, { status: 429 });
    }

    const { id } = await params;
    if (!checkRateLimit(`appointment-cancel:${id}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas tentativas. Espera um pouco e tenta de novo." }, { status: 429 });
    }

    const body = bodySchema.parse(await req.json());

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: { select: { phone: true, name: true } },
        service: { select: { name: true } },
        business: { select: { cancellationHours: true } },
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    if (normalizePhone(appointment.customer.phone) !== normalizePhone(body.phone)) {
      return NextResponse.json({ error: "Telefone não confere com esse agendamento." }, { status: 403 });
    }

    if (appointment.status === "CANCELLED") {
      return NextResponse.json({ error: "Esse agendamento já está cancelado." }, { status: 400 });
    }
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      return NextResponse.json({ error: "Esse agendamento não pode mais ser cancelado por aqui." }, { status: 400 });
    }
    if (appointment.startAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Esse agendamento já passou." }, { status: 400 });
    }

    const cancelDeadlineMs = appointment.business.cancellationHours * 60 * 60 * 1000;
    if (appointment.startAt.getTime() - Date.now() < cancelDeadlineMs) {
      return NextResponse.json(
        {
          error: `Esse agendamento está muito próximo pra cancelar sozinho (prazo mínimo: ${appointment.business.cancellationHours}h antes). Fale direto com o salão.`,
        },
        { status: 409 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } }),
      prisma.appointmentStatusHistory.create({
        data: { appointmentId: id, status: "CANCELLED", changedBy: null },
      }),
    ]);

    await emitAppointmentEvent("appointment.cancelled", appointment.businessId, {
      appointmentId: id,
      customerName: appointment.customer.name,
      serviceName: appointment.service.name,
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
