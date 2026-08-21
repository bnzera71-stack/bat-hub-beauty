import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { PixCopyBox } from "@/components/pix-copy-box";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWhatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Aguardando liberação",
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
  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const trialStillRunning = status === "TRIAL" && trialEndsAt && trialEndsAt.getTime() > Date.now();
  const trialExpired = status === "TRIAL" && trialEndsAt && trialEndsAt.getTime() <= Date.now();

  return (
    <div className="max-w-md space-y-4">
      {trialStillRunning ? (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-sm font-semibold text-zinc-900">Você está numa prévia rápida do Hub Beauty</p>
          <p className="mt-1 text-sm text-zinc-600">
            Dá uma olhada no painel — a prévia termina às{" "}
            {trialEndsAt!.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Gostou? Ative
            embaixo.
          </p>
        </div>
      ) : (
        status !== "ACTIVE" && (
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              {trialExpired ? "Sua prévia terminou" : "Sua conta foi criada 🎉"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Falta só ativar a assinatura pra liberar o painel e a página de agendamento.
            </p>
          </div>
        )
      )}

      <h1 className="text-xl font-semibold">Hub Beauty</h1>
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-2xl font-semibold">{priceLabel}/mês</p>
        <p className="mt-1 text-sm text-zinc-600">
          Status:{" "}
          <span className="font-medium">
            {trialStillRunning ? "Prévia ativa" : STATUS_LABEL[status]}
          </span>
        </p>
        {status === "ACTIVE" && subscription?.currentPeriodEnd && (
          <p className="mt-1 text-sm text-zinc-600">
            Acesso liberado até {subscription.currentPeriodEnd.toLocaleDateString("pt-BR")}.
          </p>
        )}
      </div>

      {status !== "ACTIVE" && settings.supportPixKey && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Como ativar</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Abra o app do seu banco → Pix → Pagar com chave → cola a chave copiada → valor de{" "}
              <strong>{priceLabel}</strong>.
            </p>
          </div>

          <PixCopyBox pixKey={settings.supportPixKey} />

          {settings.supportWhatsapp && (
            <a
              href={formatWhatsappLink(
                settings.supportWhatsapp,
                `Oi! Fiz o PIX da assinatura do Hub Beauty pro salão "${business?.name ?? ""}". Segue o comprovante.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Já pagou? Envie o comprovante no WhatsApp
            </a>
          )}
          <p className="text-center text-xs text-zinc-400">A gente libera seu acesso em até algumas horas.</p>
        </div>
      )}
    </div>
  );
}
