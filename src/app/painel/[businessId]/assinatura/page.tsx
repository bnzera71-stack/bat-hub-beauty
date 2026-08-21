import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWhatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Período de teste",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento atrasado",
  CANCELLED: "Cancelado",
  SUSPENDED: "Suspenso",
};

export default async function AssinaturaPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const [subscription, settings, business] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId } }),
    getAppSettings(),
    prisma.business.findUnique({ where: { id: businessId }, select: { name: true } }),
  ]);

  const status = subscription?.status ?? "TRIAL";
  const priceLabel = formatBRL(settings.currentPriceCents);

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Hub Beauty</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-2xl font-semibold">{priceLabel}/mês</p>
        <p className="mt-1 text-sm text-zinc-600">
          Status: <span className="font-medium">{STATUS_LABEL[status]}</span>
        </p>
        {status === "TRIAL" && subscription?.trialEndsAt && (
          <p className="mt-1 text-sm text-zinc-600">
            Seu teste grátis termina em {subscription.trialEndsAt.toLocaleDateString("pt-BR")}.
          </p>
        )}
        {status === "ACTIVE" && subscription?.currentPeriodEnd && (
          <p className="mt-1 text-sm text-zinc-600">
            Acesso liberado até {subscription.currentPeriodEnd.toLocaleDateString("pt-BR")}.
          </p>
        )}
      </div>

      {status !== "ACTIVE" && settings.supportPixKey && (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Como ativar</h2>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-700">
            <li>
              Faça um PIX de {priceLabel} pra chave: <br />
              <code className="mt-1 inline-block rounded bg-zinc-100 px-2 py-1 font-medium">
                {settings.supportPixKey}
              </code>
            </li>
            <li>Manda o comprovante pelo WhatsApp abaixo.</li>
            <li>A gente libera seu acesso em até algumas horas.</li>
          </ol>
          {settings.supportWhatsapp && (
            <a
              href={formatWhatsappLink(
                settings.supportWhatsapp,
                `Oi! Fiz o PIX da assinatura do Hub Beauty pro salão "${business?.name ?? ""}". Segue o comprovante.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-accent px-4 py-2.5 text-center font-medium text-accent-foreground hover:opacity-90"
            >
              Enviar comprovante no WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
