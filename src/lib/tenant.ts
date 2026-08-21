import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MembershipRole } from "@/generated/prisma";

// Toda checagem aqui bate no banco na hora, em vez de confiar em role/tenant
// gravado no JWT — evita que uma permissão revogada continue valendo até o usuário
// deslogar, e evita confiar em qualquer businessId enviado pelo cliente.

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new HttpError(401, "Não autenticado.");
  }
  return session.user.id;
}

export async function requireSuperAdmin() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isSuperAdmin) {
    throw new HttpError(403, "Acesso restrito à equipe Bat Hub.");
  }
  return user;
}

type BusinessAccess = {
  userId: string;
  role: MembershipRole;
  isSuperAdmin: boolean;
};

export async function requireBusinessAccess(
  businessId: string,
  allowedRoles: MembershipRole[] = ["OWNER", "MANAGER", "PROFESSIONAL"]
): Promise<BusinessAccess> {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isSuperAdmin) {
    return { userId, role: "OWNER", isSuperAdmin: true };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_businessId: { userId, businessId } },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new HttpError(403, "Você não tem acesso a este negócio.");
  }

  return { userId, role: membership.role, isSuperAdmin: false };
}

// Profissional só pode mexer nos próprios atendimentos; owner/manager e super admin
// passam direto.
export async function requireOwnProfessionalOrManager(
  businessId: string,
  professionalId: string
): Promise<BusinessAccess> {
  const access = await requireBusinessAccess(businessId);
  if (access.isSuperAdmin || access.role !== "PROFESSIONAL") {
    return access;
  }

  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, businessId },
  });

  if (!professional || professional.userId !== access.userId) {
    throw new HttpError(403, "Você só pode acessar seus próprios atendimentos.");
  }

  return access;
}
