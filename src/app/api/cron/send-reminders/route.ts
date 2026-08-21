import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

// Chamada pelo Netlify Scheduled Function (netlify/functions/send-reminders-cron.mts),
// roda de hora em hora. Janela de 23h–25h à frente (2h de folga) garante que
// nenhum agendamento fique sem lembrete mesmo se uma execução atrasar/falhar.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { gte: windowStart, lte: windowEnd },
      reminderSentAt: null,
      reminderEndpoint: { not: null },
    },
    include: {
      customer: { select: { name: true } },
      service: { select: { name: true } },
      business: { select: { name: true, timezone: true } },
    },
  });

  let sent = 0;
  let expired = 0;
  for (const a of appointments) {
    const time = a.startAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: a.business.timezone,
    });
    const result = await sendPushToSubscription(
      { endpoint: a.reminderEndpoint!, p256dh: a.reminderP256dh!, auth: a.reminderAuth! },
      {
        title: `Lembrete: ${a.service.name} amanhã`,
        body: `Seu horário em ${a.business.name} é às ${time}.`,
      }
    );
    if (result.expired) {
      expired += 1;
      await prisma.appointment.update({
        where: { id: a.id },
        data: { reminderEndpoint: null, reminderP256dh: null, reminderAuth: null },
      });
    } else {
      sent += 1;
      await prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
    }
  }

  return NextResponse.json({ checked: appointments.length, sent, expired });
}
