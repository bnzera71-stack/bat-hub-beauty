import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { generateUniqueSlug } from "@/lib/slug";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8, "Mínimo 8 caracteres."),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const email = body.ownerEmail.toLowerCase().trim();

    // Consultas independentes rodando em paralelo (não uma atrás da outra) pra não
    // somar latência à toa — cadastro precisa ser rápido.
    const [existingUser, slug, settings, passwordHash] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      // Link provisório — a dona escolhe o definitivo em Configurações, quando
      // estiver pronta pra divulgar (evita pedir isso antes de ela ver o produto).
      generateUniqueSlug(body.businessName),
      getAppSettings(),
      bcrypt.hash(body.ownerPassword, 12),
    ]);

    if (existingUser) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const businessId = crypto.randomUUID();

    const [, business] = await prisma.$transaction([
      prisma.user.create({
        data: { id: userId, email, passwordHash, name: body.ownerName },
      }),
      prisma.business.create({
        data: { id: businessId, slug, name: body.businessName },
      }),
      prisma.membership.create({
        data: { userId, businessId, role: "OWNER" },
      }),
      prisma.subscription.create({
        data: {
          businessId,
          status: "TRIAL",
          priceCents: settings.currentPriceCents,
          trialEndsAt: addDays(new Date(), settings.trialDays),
        },
      }),
      prisma.auditLog.create({
        data: { businessId, userId, action: "business.created" },
      }),
    ]);

    return NextResponse.json({ slug: business.slug, businessId: business.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
