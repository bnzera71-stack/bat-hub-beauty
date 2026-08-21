import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

function generateTempPassword(): string {
  // Fácil de ditar por WhatsApp: sem caracteres ambíguos (0/O, 1/l/I).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
}

// Reset assistido: sem envio de e-mail configurado ainda, o Super Admin gera
// uma senha temporária aqui e repassa pra dona por WhatsApp.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    await requireSuperAdmin();

    const ownerMembership = await prisma.membership.findFirst({
      where: { businessId, role: "OWNER" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!ownerMembership) {
      return NextResponse.json({ error: "Dona do negócio não encontrada." }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: ownerMembership.user.id },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: { businessId, action: "user.password_reset_by_admin" },
    });

    return NextResponse.json({
      email: ownerMembership.user.email,
      tempPassword,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
