import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  action: z.enum(["activate", "suspend", "cancel", "back_to_trial", "extend_trial"]),
  days: z.number().int().min(1).max(30).optional(),
});

// Ativação manual (seção "Ativação manual + gateway depois" do plano): a dona do
// salão manda PIX pro dono da Bat Hub, e é aqui que a Bat Hub libera o acesso.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const admin = await requireSuperAdmin();
    const body = bodySchema.parse(await req.json());

    const existing = await prisma.subscription.findUnique({ where: { businessId } });
    if (!existing) {
      return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 });
    }

    const now = new Date();
    let data: Record<string, unknown>;
    switch (body.action) {
      case "activate":
        data = {
          status: "ACTIVE",
          startedAt: existing.startedAt ?? now,
          currentPeriodStart: now,
          currentPeriodEnd: addDays(now, 30),
          cancelledAt: null,
        };
        break;
      case "suspend":
        data = { status: "SUSPENDED" };
        break;
      case "cancel":
        data = { status: "CANCELLED", cancelledAt: now };
        break;
      case "back_to_trial":
        data = { status: "TRIAL", cancelledAt: null };
        break;
      case "extend_trial":
        // Prévia de demonstração pra cliente em prospecção — dias a mais só nesse
        // negócio específico, sem tocar no trialMinutes padrão (que é curto de
        // propósito, contra abuso de cadastro público).
        data = { status: "TRIAL", trialEndsAt: addDays(now, body.days ?? 3), cancelledAt: null };
        break;
    }

    const [subscription] = await prisma.$transaction([
      prisma.subscription.update({ where: { businessId }, data }),
      prisma.auditLog.create({
        data: {
          businessId,
          userId: admin.id,
          action: `subscription.${body.action}`,
        },
      }),
    ]);

    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
