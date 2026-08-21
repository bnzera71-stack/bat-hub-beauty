// Lógica pura (sem I/O) compartilhada entre o gate do servidor (tenant.ts) e o
// gate do cliente (PainelShell) — mesma regra nos dois lados, sem duplicar.
export function isSubscriptionUsable(
  status: string | null | undefined,
  trialEndsAt: string | Date | null | undefined
): boolean {
  if (status === "ACTIVE") return true;
  if (status === "TRIAL" && trialEndsAt) {
    return new Date(trialEndsAt).getTime() > Date.now();
  }
  return false;
}
