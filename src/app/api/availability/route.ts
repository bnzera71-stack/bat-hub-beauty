import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";

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
    select: { id: true, status: true },
  });
  if (!business || business.status !== "ACTIVE") {
    return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  }

  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId: parsed.data.serviceId,
    date: new Date(`${parsed.data.date}T00:00:00`),
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
