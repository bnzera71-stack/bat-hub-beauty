import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  businessName: z.string().min(2).max(120),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífen."),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8, "Mínimo 8 caracteres."),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const email = body.ownerEmail.toLowerCase().trim();
    const slug = body.slug.toLowerCase().trim();

    const [existingUser, existingSlug] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.business.findUnique({ where: { slug } }),
    ]);
    if (existingUser) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }
    if (existingSlug) {
      return NextResponse.json({ error: "Este link já está em uso, escolha outro." }, { status: 409 });
    }

    const settings = await getAppSettings();
    const passwordHash = await bcrypt.hash(body.ownerPassword, 12);

    // IDs gerados aqui (em vez de deixar o Prisma gerar durante o create) porque o
    // pooler do Supabase (porta 6543, transaction mode) não sustenta transaction
    // interativa (`$transaction(async tx => ...)`) — cada round-trip pode cair em
    // outra conexão do pool. Gerando os IDs antes, dá pra usar `$transaction([...])`
    // em lote (um único round-trip), que funciona bem com pgbouncer.
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
    const result = { business };

    return NextResponse.json({ slug: result.business.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
