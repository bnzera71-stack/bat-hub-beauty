import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

// Camada de eventos do domínio (seção 16 do plano). MVP1 só grava Notification
// interna no painel. MVP2 pluga aqui push/WhatsApp/e-mail sem mudar quem dispara
// o evento.

export type AppointmentEventType =
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.completed";

export async function emitAppointmentEvent(
  type: AppointmentEventType,
  businessId: string,
  payload: Record<string, unknown>
) {
  await prisma.notification.create({
    data: { businessId, type, payload: payload as Prisma.InputJsonValue },
  });
  // Ponto de extensão futuro: push / WhatsApp / e-mail, disparado a partir do
  // mesmo evento, sem tocar em quem chama emitAppointmentEvent.
}
