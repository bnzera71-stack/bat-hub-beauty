import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PainelShell } from "@/components/painel-shell";

export default async function PainelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  let role: "OWNER" | "MANAGER" | "PROFESSIONAL" | "SUPERADMIN" = "OWNER";
  if (!user.isSuperAdmin) {
    const membership = await prisma.membership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId } },
    });
    if (!membership) redirect("/login");
    role = membership.role;
  } else {
    role = "SUPERADMIN";
  }

  const [business, subscription] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId } }),
    prisma.subscription.findUnique({ where: { businessId }, select: { status: true, trialEndsAt: true } }),
  ]);
  if (!business) redirect("/login");

  return (
    <PainelShell
      businessId={businessId}
      businessName={business.name}
      userName={user.name}
      role={role}
      isSuperAdmin={role === "SUPERADMIN"}
      subscriptionStatus={subscription?.status ?? "TRIAL"}
      trialEndsAt={subscription?.trialEndsAt?.toISOString() ?? null}
    >
      {children}
    </PainelShell>
  );
}
