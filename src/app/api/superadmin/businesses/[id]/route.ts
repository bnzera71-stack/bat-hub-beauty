import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

// Exclusão total (seção 21 LGPD: direito de exclusão). Apaga o negócio inteiro —
// clientes, agendamentos, serviços etc caem em cascata pelas FKs — e também os
// usuários (e-mail/senha) que só pertenciam a esse negócio, pra não sobrar nada.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const admin = await requireSuperAdmin();

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, memberships: { select: { userId: true } } },
    });
    if (!business) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const memberUserIds = business.memberships.map((m) => m.userId);

    await prisma.business.delete({ where: { id: businessId } });

    for (const userId of memberUserIds) {
      const remaining = await prisma.membership.count({ where: { userId } });
      if (remaining === 0) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && !user.isSuperAdmin) {
          await prisma.user.delete({ where: { id: userId } });
        }
      }
    }

    console.log(`[superadmin] ${admin.email} excluiu o negócio "${business.name}" (${businessId})`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
