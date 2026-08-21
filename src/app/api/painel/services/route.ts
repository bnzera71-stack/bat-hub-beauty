import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const services = await prisma.service.findMany({
      where: { businessId },
      include: { category: true, professionals: { include: { professional: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ services });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  businessId: z.string().min(1),
  categoryId: z.string().optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  priceCents: z.number().int().nonnegative(),
  durationMin: z.number().int().positive().max(600),
  bufferMin: z.number().int().nonnegative().max(240).default(0),
  professionalIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    const service = await prisma.service.create({
      data: {
        businessId: body.businessId,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description,
        photoUrl: body.photoUrl,
        priceCents: body.priceCents,
        durationMin: body.durationMin,
        bufferMin: body.bufferMin,
        professionals: {
          create: body.professionalIds.map((professionalId) => ({ professionalId })),
        },
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
