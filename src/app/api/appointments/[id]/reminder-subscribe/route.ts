import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

// Rota pública (o cliente que agendou opta por lembrete na hora da confirmação,
// sem precisar de conta) — protegida por rate limit e pelo fato do id do
// agendamento ser um cuid não-adivinhável, igual ao resto do fluxo público.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`reminder-subscribe:${ip}`, 20, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas tentativas. Espera um pouco." }, { status: 429 });
    }

    const { id } = await params;
    const body = bodySchema.parse(await req.json());

    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { id: true, startAt: true } });
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }
    if (appointment.startAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Esse agendamento já passou." }, { status: 400 });
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        reminderEndpoint: body.endpoint,
        reminderP256dh: body.p256dh,
        reminderAuth: body.auth,
        reminderSentAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
