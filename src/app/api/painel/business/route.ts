import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ business });
  } catch (error) {
    return errorResponse(error);
  }
}

const updateSchema = z.object({
  businessId: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífen.")
    .optional(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  instagram: z.string().max(120).nullable().optional(),
  whatsapp: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  confirmationMode: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
  minLeadMinutes: z.number().int().min(0).max(10080).optional(),
  maxLeadDays: z.number().int().min(1).max(365).optional(),
  cancellationHours: z.number().int().min(0).max(720).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = updateSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER"]);

    if (body.slug) {
      const existing = await prisma.business.findUnique({ where: { slug: body.slug } });
      if (existing && existing.id !== body.businessId) {
        return NextResponse.json({ error: "Esse link já está em uso, escolha outro." }, { status: 409 });
      }
    }

    const { businessId, ...data } = body;
    const business = await prisma.business.update({ where: { id: businessId }, data });

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
