import { prisma } from "@/lib/db";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { addMinutes, format, isBefore } from "date-fns";

export type Slot = {
  start: Date;
  end: Date;
  professionalId: string;
};

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] as const;

function parseHM(value: string): { h: number; m: number } {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
}

/**
 * Calcula os horários livres de um dia para um serviço, considerando horário do
 * negócio, override do profissional, bloqueios e agendamentos já existentes.
 * Este resultado é só para EXIBIR opções — a garantia real de não-conflito na
 * hora de reservar é o exclusion constraint do Postgres (ver prisma/migrations/manual).
 */
export async function getAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  date: Date; // qualquer instante do dia desejado
  professionalId?: string; // omitido = "qualquer profissional disponível"
}): Promise<Slot[]> {
  const { businessId, serviceId, date, professionalId } = params;

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  });
  if (!service) return [];

  const eligibleProfessionals = await prisma.professional.findMany({
    where: {
      businessId,
      active: true,
      ...(professionalId ? { id: professionalId } : {}),
      services: { some: { serviceId } },
    },
  });
  if (eligibleProfessionals.length === 0) return [];

  const timezone = business.timezone;
  const zonedDate = toZonedTime(date, timezone);
  const weekday = zonedDate.getDay();
  const dayKey = format(zonedDate, "yyyy-MM-dd");

  const [businessHours, professionalHoursRows, blocked, appointments] = await Promise.all([
    prisma.businessHours.findMany({ where: { businessId, weekday } }),
    prisma.professionalHours.findMany({
      where: { professionalId: { in: eligibleProfessionals.map((p) => p.id) }, weekday },
    }),
    prisma.blockedPeriod.findMany({
      where: {
        businessId,
        OR: [{ professionalId: null }, { professionalId: { in: eligibleProfessionals.map((p) => p.id) } }],
      },
    }),
    prisma.appointment.findMany({
      where: {
        businessId,
        professionalId: { in: eligibleProfessionals.map((p) => p.id) },
        status: { in: [...ACTIVE_STATUSES] },
      },
    }),
  ]);

  const now = new Date();
  const earliestStart = addMinutes(now, business.minLeadMinutes);
  const latestDate = addMinutes(now, business.maxLeadDays * 24 * 60);
  if (isBefore(latestDate, zonedDate)) return [];

  const slots: Slot[] = [];

  for (const professional of eligibleProfessionals) {
    const bizWindow = businessHours[0];
    if (!bizWindow) continue; // negócio fechado nesse dia da semana

    const profOverride = professionalHoursRows.find((h) => h.professionalId === professional.id);
    const windowStart = profOverride ? profOverride.startTime : bizWindow.startTime;
    const windowEnd = profOverride ? profOverride.endTime : bizWindow.endTime;

    const bizStart = parseHM(bizWindow.startTime);
    const bizEnd = parseHM(bizWindow.endTime);
    const profStart = parseHM(windowStart);
    const profEnd = parseHM(windowEnd);

    // Intersecção entre horário do negócio e do profissional.
    const effStartMinutes = Math.max(bizStart.h * 60 + bizStart.m, profStart.h * 60 + profStart.m);
    const effEndMinutes = Math.min(bizEnd.h * 60 + bizEnd.m, profEnd.h * 60 + profEnd.m);
    if (effStartMinutes >= effEndMinutes) continue;

    const stepMinutes = service.durationMin + service.bufferMin;
    const professionalBlocks = blocked.filter(
      (b) => b.professionalId === null || b.professionalId === professional.id
    );
    const professionalAppointments = appointments.filter(
      (a) => a.professionalId === professional.id
    );

    for (let minute = effStartMinutes; minute + service.durationMin <= effEndMinutes; minute += stepMinutes) {
      const h = Math.floor(minute / 60);
      const m = minute % 60;
      const slotStartLocal = new Date(
        `${dayKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`
      );
      const slotStart = fromZonedTime(slotStartLocal, timezone);
      const slotEnd = addMinutes(slotStart, service.durationMin);

      if (isBefore(slotStart, earliestStart)) continue;

      const overlapsBlock = professionalBlocks.some(
        (b) => slotStart < b.endAt && slotEnd > b.startAt
      );
      if (overlapsBlock) continue;

      const overlapsAppointment = professionalAppointments.some(
        (a) => slotStart < a.endAt && slotEnd > a.startAt
      );
      if (overlapsAppointment) continue;

      slots.push({ start: slotStart, end: slotEnd, professionalId: professional.id });
    }
  }

  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  return slots;
}
