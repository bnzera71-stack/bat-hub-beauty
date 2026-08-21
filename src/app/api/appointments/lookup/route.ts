import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  slug: z.string().min(1),
  phone: z.string().min(8).max(20),
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

// Rota pública sem login — telefone é a mesma "identidade" já usada pra criar o
// agendamento (Customer é único por businessId+phone). Não existe conta/senha
// nesse fluxo, então quem sabe o telefone consegue ver/cancelar, igual a quem
// sabe o telefone consegue marcar em nome de alguém — mesmo nível de confiança
// do resto do fluxo público.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(`appointment-lookup:${ip}`, 15, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas tentativas. Espera um pouco e tenta de novo." }, { status: 429 });
    }

    const body = bodySchema.parse(await req.json());
    const phone = normalizePhone(body.phone);
    if (!checkRateLimit(`appointment-lookup-phone:${phone}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas tentativas. Espera um pouco e tenta de novo." }, { status: 429 });
    }

    const business = await prisma.business.findUnique({
      where: { slug: body.slug },
      select: { id: true, name: true, whatsapp: true, cancellationHours: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const customers = await prisma.customer.findMany({
      where: { businessId: business.id },
      select: { id: true, phone: true },
    });
    const customer = customers.find((c) => normalizePhone(c.phone) === phone);

    if (!customer) {
      return NextResponse.json({ business: { name: business.name, whatsapp: business.whatsapp }, appointments: [] });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        customerId: customer.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gt: new Date() },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        status: true,
        service: { select: { name: true } },
        professional: { select: { name: true } },
      },
    });

    const cancelDeadlineMs = business.cancellationHours * 60 * 60 * 1000;
    const result = appointments.map((a) => ({
      id: a.id,
      startAt: a.startAt,
      status: a.status,
      serviceName: a.service.name,
      professionalName: a.professional.name,
      cancellable: a.startAt.getTime() - Date.now() >= cancelDeadlineMs,
    }));

    return NextResponse.json({
      business: { name: business.name, whatsapp: business.whatsapp },
      appointments: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
