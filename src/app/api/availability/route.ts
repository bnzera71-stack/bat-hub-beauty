import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  professionalId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    slug: searchParams.get("slug"),
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
    professionalId: searchParams.get("professionalId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, status: true, timezone: true },
  });
  if (!business || business.status !== "ACTIVE") {
    return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  }

  // Isso roda no servidor (Netlify Function, relógio em UTC) — nunca dá pra
  // usar `new Date("YYYY-MM-DDT00:00:00")` puro, que o runtime interpreta no
  // fuso DELE, não no fuso do salão. Precisa ancorar explicitamente no fuso
  // do negócio, senão o dia calculado desliza pro dia anterior (América/SP é
  // atrás de UTC) e todo mundo vê "sem horários disponíveis".
  const date = fromZonedTime(`${parsed.data.date}T00:00:00`, business.timezone);

  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    date,
    professionalId: parsed.data.professionalId,
  });

  return NextResponse.json({
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      professionalId: s.professionalId,
    })),
  });
}
