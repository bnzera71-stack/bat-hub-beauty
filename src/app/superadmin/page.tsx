import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SuperAdminBusinessRow } from "@/components/superadmin-business-row";
import { SuperAdminHeader } from "@/components/superadmin-header";

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isSuperAdmin) redirect("/login");

  const businesses = await prisma.business.findMany({
    include: { subscription: true, _count: { select: { appointments: true } } },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  const active = businesses.filter((b) => b.subscription?.status === "ACTIVE").length;
  const trialRunning = businesses.filter(
    (b) => b.subscription?.status === "TRIAL" && b.subscription.trialEndsAt && b.subscription.trialEndsAt.getTime() > now
  ).length;
  const trialExpired = businesses.filter(
    (b) => b.subscription?.status === "TRIAL" && (!b.subscription.trialEndsAt || b.subscription.trialEndsAt.getTime() <= now)
  ).length;
  const mrrCents = businesses
    .filter((b) => b.subscription?.status === "ACTIVE")
    .reduce((sum, b) => sum + (b.subscription?.priceCents ?? 0), 0);

  return (
    <div className="min-h-dvh bg-zinc-50">
      <SuperAdminHeader />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Negócios" value={businesses.length} />
          <Stat label="Assinaturas ativas" value={active} />
          <Stat label="Prévia rolando agora" value={trialRunning} />
          <Stat label="Prévia expirada" value={trialExpired} />
          <Stat label="MRR" value={(mrrCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        </div>

        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {businesses.map((b) => (
            <SuperAdminBusinessRow
              key={b.id}
              business={{
                id: b.id,
                name: b.name,
                slug: b.slug,
                appointmentCount: b._count.appointments,
                subscriptionStatus: b.subscription?.status ?? "TRIAL",
                currentPeriodEnd: b.subscription?.currentPeriodEnd?.toISOString() ?? null,
                trialEndsAt: b.subscription?.trialEndsAt?.toISOString() ?? null,
              }}
            />
          ))}
          {businesses.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum negócio cadastrado ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
