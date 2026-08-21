import { prisma } from "@/lib/db";

// Linha única de configuração comercial (seção 32 do plano). Preço e duração do
// trial vivem aqui — nunca hardcodar 59.90 ou o número de dias de trial na UI.
export async function getAppSettings() {
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      currentPriceCents: 5990,
      trialDays: 14,
      supportPixKey: "61998568408",
      supportWhatsapp: "61998568408",
    },
  });
  return settings;
}
