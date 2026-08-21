import { prisma } from "@/lib/db";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [todayAppointments, monthCompleted, business, hoursCount, servicesCount, professionalsCount] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { businessId, startAt: { gte: dayStart, lte: dayEnd } },
        include: {
          customer: { select: { name: true } },
          professional: { select: { name: true } },
          service: { select: { name: true, priceCents: true } },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.appointment.findMany({
        where: { businessId, status: "COMPLETED", startAt: { gte: monthStart, lte: now } },
        select: { service: { select: { id: true, name: true, priceCents: true } } },
      }),
      prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } }),
      prisma.businessHours.count({ where: { businessId } }),
      prisma.service.count({ where: { businessId, active: true } }),
      prisma.professional.count({ where: { businessId, active: true } }),
    ]);

  const pending = todayAppointments.filter((a) => a.status === "PENDING").length;
  const completed = todayAppointments.filter((a) => a.status === "COMPLETED");
  const revenue = completed.reduce((sum, a) => sum + a.service.priceCents, 0);
  const nextAppointment = todayAppointments.find((a) =>
    ["CONFIRMED", "PENDING", "ARRIVED"].includes(a.status)
  );

  const monthRevenue = monthCompleted.reduce((sum, a) => sum + a.service.priceCents, 0);
  const serviceCounts = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of monthCompleted) {
    const entry = serviceCounts.get(a.service.id) ?? { name: a.service.name, count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += a.service.priceCents;
    serviceCounts.set(a.service.id, entry);
  }
  const topService = Array.from(serviceCounts.values()).sort((a, b) => b.count - a.count)[0] ?? null;
  const monthName = now.toLocaleDateString("pt-BR", { month: "long" });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Hoje</h1>

      {business && (
        <OnboardingChecklist
          businessId={businessId}
          slug={business.slug}
          hasHours={hoursCount > 0}
          hasServices={servicesCount > 0}
          hasProfessionals={professionalsCount > 0}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Agendamentos hoje" value={todayAppointments.length} />
        <Stat label="Pendentes" value={pending} />
        <Stat label="Atendidos" value={completed.length} />
        <Stat label="Faturamento hoje" value={formatBRL(revenue)} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Próximo cliente</h2>
        {nextAppointment ? (
          <p className="mt-2 text-sm text-zinc-700">
            {nextAppointment.customer.name} — {nextAppointment.service.name} com{" "}
            {nextAppointment.professional.name} às{" "}
            {nextAppointment.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Sua agenda está livre hoje.</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Faturamento de {monthLabel}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Total do mês" value={formatBRL(monthRevenue)} />
          <Stat label="Atendimentos" value={monthCompleted.length} />
          <Stat label="Serviço mais vendido" value={topService ? topService.name : "—"} />
        </div>
        {monthCompleted.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">Nenhum atendimento finalizado neste mês ainda.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-semibold text-zinc-900 ${
          typeof value === "string" && value.length > 12 ? "truncate text-base" : "text-2xl"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}
