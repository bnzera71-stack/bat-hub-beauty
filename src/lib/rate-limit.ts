// Limite simples em memória (janela fixa) contra spam/força bruta nas rotas
// públicas. Limitação real: cada instância de function do Netlify tem sua
// própria memória, então isso não é 100% à prova de um ataque distribuído —
// mas já barra abuso comum (bot batendo na mesma rota várias vezes seguidas).
const buckets = new Map<string, { count: number; resetAt: number }>();

// Evita crescimento infinito do Map em instâncias de longa duração.
function cleanup(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-nf-client-connection-ip") ?? "unknown";
}
