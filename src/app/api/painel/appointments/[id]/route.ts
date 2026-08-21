import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { requireOwnProfessionalOrManager } from "@/lib/tenant";
import { getAvailableSlots } from "@/lib/availability";
import { emitAppointmentEvent } from "@/lib/events";
import { errorResponse } from "@/lib/api";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("arrived") }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("noshow") }),
  z.object({ action: z.literal("cancel"), reason: z.string().max(300).optional() }),
  z.object({
    action: z.literal("reschedule"),
    start: z.string().datetime(),
    professionalId: z.string().min(1).optional(),
  }),
]);

const STATUS_BY_ACTION: Record<string, string> = {
  confirm: "CONFIRMED",
  arrived: "ARRIVED",
  start: "IN_PROGRESS",
  complete: "COMPLETED",
  noshow: "NO_SHOW",
  cancel: "CANCELLED",
};

function isConflictError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("no_overlapping_appointments") || message.includes("exclusion constraint");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = actionSchema.parse(await req.json());

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    const access = await requireOwnProfessionalOrManager(
      appointment.businessId,
      appointment.professionalId
    );

    if (body.action === "reschedule") {
      const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
      if (!service) {
        return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
      }
      const professionalId = body.professionalId ?? appointment.professionalId;
      const startAt = new Date(body.start);
      const endAt = addMinutes(startAt, service.durationMin);

      const dayStart = new Date(startAt);
      dayStart.setHours(0, 0, 0, 0);
      const slots = await getAvailableSlots({
        businessId: appointment.businessId,
        serviceId: service.id,
        date: dayStart,
        professionalId,
      });
      const stillAvailable = slots.some((s) => s.start.getTime() === startAt.getTime());
      if (!stillAvailable) {
        return NextResponse.json({ error: "Esse horário não está disponível." }, { status: 409 });
      }

      const [updated] = await prisma.$transaction([
        prisma.appointment.update({
          where: { id },
          data: { startAt, endAt, professionalId, status: "CONFIRMED" },
        }),
        prisma.appointmentStatusHistory.create({
          data: { appointmentId: id, status: "CONFIRMED", changedBy: access.userId },
        }),
      ]);

      await emitAppointmentEvent("appointment.rescheduled", appointment.businessId, {
        appointmentId: id,
        startAt,
      });

      return NextResponse.json({ appointment: updated });
    }

    const newStatus = STATUS_BY_ACTION[body.action];
    const [updated] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id },
        data: { status: newStatus as never },
      }),
      prisma.appointmentStatusHistory.create({
        data: { appointmentId: id, status: newStatus as never, changedBy: access.userId },
      }),
    ]);

    const eventType = body.action === "cancel" ? "appointment.cancelled" : body.action === "confirm" ? "appointment.confirmed" : body.action === "complete" ? "appointment.completed" : undefined;
    if (eventType) {
      await emitAppointmentEvent(eventType, appointment.businessId, { appointmentId: id });
    }

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    if (isConflictError(error)) {
      return NextResponse.json({ error: "Conflito de horário ao reagendar." }, { status: 409 });
    }
    return errorResponse(error);
  }
}
