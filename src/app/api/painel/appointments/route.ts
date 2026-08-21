import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { getAvailableSlots } from "@/lib/availability";
import { emitAppointmentEvent } from "@/lib/events";
import { errorResponse } from "@/lib/api";

const querySchema = z.object({
  businessId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  professionalId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.parse({
      businessId: searchParams.get("businessId"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      professionalId: searchParams.get("professionalId") ?? undefined,
    });

    const access = await requireBusinessAccess(parsed.businessId);

    let professionalFilter = parsed.professionalId;
    if (access.role === "PROFESSIONAL" && !access.isSuperAdmin) {
      const own = await prisma.professional.findFirst({
        where: { businessId: parsed.businessId, userId: access.userId },
        select: { id: true },
      });
      professionalFilter = own?.id ?? "__none__";
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: parsed.businessId,
        startAt: { gte: new Date(parsed.from), lte: new Date(parsed.to) },
        ...(professionalFilter ? { professionalId: professionalFilter } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  start: z.string().datetime(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email().optional().or(z.literal("")),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    const access = await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    let professionalId = body.professionalId;
    if (access.role === "PROFESSIONAL" && !access.isSuperAdmin) {
      const own = await prisma.professional.findFirst({
        where: { businessId: body.businessId, userId: access.userId },
        select: { id: true },
      });
      if (!own || own.id !== professionalId) {
        professionalId = own?.id ?? professionalId;
      }
    }

    const service = await prisma.service.findFirst({
      where: { id: body.serviceId, businessId: body.businessId, active: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const startAt = new Date(body.start);
    const endAt = addMinutes(startAt, service.durationMin);

    const dayStart = new Date(startAt);
    dayStart.setHours(0, 0, 0, 0);
    const slots = await getAvailableSlots({
      businessId: body.businessId,
      serviceId: service.id,
      date: dayStart,
      professionalId,
    });
    const stillAvailable = slots.some((s) => s.start.getTime() === startAt.getTime());
    if (!stillAvailable) {
      return NextResponse.json({ error: "Esse horário não está disponível." }, { status: 409 });
    }

    const customer = await prisma.customer.upsert({
      where: { businessId_phone: { businessId: body.businessId, phone: body.customerPhone } },
      update: { name: body.customerName, email: body.customerEmail || undefined },
      create: {
        businessId: body.businessId,
        name: body.customerName,
        phone: body.customerPhone,
        email: body.customerEmail || undefined,
      },
    });

    const appointmentId = crypto.randomUUID();
    const [appointment] = await prisma.$transaction([
      prisma.appointment.create({
        data: {
          id: appointmentId,
          businessId: body.businessId,
          customerId: customer.id,
          professionalId,
          serviceId: service.id,
          startAt,
          endAt,
          status: "CONFIRMED",
          source: "MANUAL",
          note: body.note,
        },
      }),
      prisma.appointmentStatusHistory.create({
        data: { appointmentId, status: "CONFIRMED", changedBy: access.userId },
      }),
    ]);

    await emitAppointmentEvent("appointment.created", body.businessId, {
      appointmentId: appointment.id,
      startAt: appointment.startAt,
      customerName: body.customerName,
      serviceName: service.name,
      source: "MANUAL",
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
