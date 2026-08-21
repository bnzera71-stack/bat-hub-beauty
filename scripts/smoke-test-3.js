const BASE = "http://localhost:3000";

function makeJar() {
  let cookies = {};
  return {
    header: () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    async req(path, opts = {}) {
      const res = await fetch(BASE + path, {
        ...opts,
        headers: { ...(opts.headers || {}), cookie: this.header() },
        redirect: "manual",
      });
      const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of raw) {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        cookies[k] = v;
      }
      return res;
    },
  };
}

async function login(jar, email, password) {
  let res = await jar.req("/api/auth/csrf");
  const { csrfToken } = await res.json();
  res = await jar.req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
  return res.status;
}

async function main() {
  const unique = Date.now();
  const email = `dona3_${unique}@teste.com`;
  const password = "senhaSegura123";
  const owner = makeJar();

  let res = await owner.req("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName: "Studio Gated", ownerName: "Dona 3", ownerEmail: email, ownerPassword: password }),
  });
  const signupData = await res.json();
  console.log("signup:", res.status, signupData);
  const businessId = signupData.businessId;
  if (!businessId) throw new Error("signup não retornou businessId");

  await login(owner, email, password);

  function hasDashboard(html) {
    return html.includes("Primeiros passos") || html.includes(">Hoje<");
  }

  // logo após o cadastro: ainda dentro da prévia de 15min, dashboard acessível
  res = await owner.req(`/painel/${businessId}/dashboard`);
  const htmlDuringTrial = await res.text();
  console.log("dashboard durante a prévia — tem conteúdo?", hasDashboard(htmlDuringTrial), "(esperado: true)");
  if (!hasDashboard(htmlDuringTrial)) throw new Error("BUG: prévia de 15min não libera o dashboard!");

  // expira a prévia manualmente (sem esperar 15min de verdade)
  const { PrismaClient } = require("../src/generated/prisma");
  const prisma = new PrismaClient();
  await prisma.subscription.update({
    where: { businessId },
    data: { trialEndsAt: new Date(Date.now() - 60_000) },
  });
  await prisma.$disconnect();

  // agora deve estar bloqueado
  res = await owner.req(`/painel/${businessId}/dashboard`);
  const htmlAfterExpiry = await res.text();
  console.log("dashboard após prévia expirar — tem conteúdo?", hasDashboard(htmlAfterExpiry), "(esperado: false)");
  if (hasDashboard(htmlAfterExpiry)) throw new Error("BUG: dashboard continua acessível com prévia expirada!");

  // assinatura deve estar acessível normalmente
  res = await owner.req(`/painel/${businessId}/assinatura`);
  const assinaturaHtml = await res.text();
  console.log("assinatura acessível?", assinaturaHtml.includes("Como ativar"));

  // superadmin ativa
  const admin = makeJar();
  await login(admin, "bnthebat@gmail.com", "Bnzera$71");
  res = await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate" }),
  });
  console.log("superadmin ativou:", res.status);

  // agora dashboard deve mostrar conteúdo normal
  res = await owner.req(`/painel/${businessId}/dashboard`);
  const htmlAfterActivation = await res.text();
  const hasDashboardContentAfter = htmlAfterActivation.includes("Primeiros passos") || htmlAfterActivation.includes(">Hoje<");
  console.log("dashboard depois de ativar — tem conteúdo?", hasDashboardContentAfter, "(esperado: true)");
  if (!hasDashboardContentAfter) throw new Error("BUG: dashboard continua bloqueado depois de ativado!");

  // limpeza
  res = await admin.req(`/api/superadmin/businesses/${businessId}`, { method: "DELETE" });
  console.log("limpeza:", res.status);

  console.log("\n✅ TESTE 3 PASSOU: gate de assinatura funcionando (bloqueia antes, libera depois de ativar).");
}

main().catch((e) => {
  console.error("\n❌ TESTE 3 FALHOU:", e.message);
  process.exit(1);
});
