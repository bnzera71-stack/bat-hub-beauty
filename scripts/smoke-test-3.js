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

  // dashboard antes de liberar: HTML inicial não deve conter conteúdo do dashboard
  res = await owner.req(`/painel/${businessId}/dashboard`);
  const htmlBeforeActivation = await res.text();
  const hasDashboardContent = htmlBeforeActivation.includes("Primeiros passos") || htmlBeforeActivation.includes(">Hoje<");
  console.log("dashboard antes de ativar — tem conteúdo do dashboard?", hasDashboardContent, "(esperado: false)");
  if (hasDashboardContent) throw new Error("BUG: dashboard acessível sem assinatura ativa!");

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
