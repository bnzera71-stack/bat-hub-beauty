import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { sendPushToBusiness } from "@/lib/push";

// Camada de eventos do domínio (seção 16 do plano). Grava Notification interna
// no painel e dispara push de verdade pro celular — sem mudar quem chama.

export type AppointmentEventType =
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.completed";

function describeForPush(
  type: AppointmentEventType,
  payload: Record<string, unknown>
): { title: string; body: string } {
  const customerName = typeof payload.customerName === "string" ? payload.customerName : "Alguém";
  const serviceName = typeof payload.serviceName === "string" ? ` — ${payload.serviceName}` : "";
  switch (type) {
    case "appointment.created":
      return { title: "Novo agendamento", body: `${customerName} marcou${serviceName}` };
    case "appointment.cancelled":
      return { title: "Agendamento cancelado", body: `${customerName} cancelou${serviceName}` };
    default:
      return { title: "Hub Beauty", body: `${customerName}${serviceName}` };
  }
}

export async function emitAppointmentEvent(
  type: AppointmentEventType,
  businessId: string,
  payload: Record<string, unknown>
) {
  await prisma.notification.create({
    data: { businessId, type, payload: payload as Prisma.InputJsonValue },
  });

  const { title, body } = describeForPush(type, payload);
  await sendPushToBusiness(businessId, { title, body, url: `/painel/${businessId}/agenda` }).catch((err) =>
    console.error("[push] erro ao notificar negócio", businessId, err)
  );
}
