import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const professionals = await prisma.professional.findMany({
      where: { businessId },
      include: { hours: true, services: { include: { service: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ professionals });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2).max(120),
  photoUrl: z.string().url().optional(),
  specialties: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    const professional = await prisma.professional.create({
      data: {
        businessId: body.businessId,
        name: body.name,
        photoUrl: body.photoUrl,
        specialties: body.specialties,
      },
    });

    return NextResponse.json({ professional }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
