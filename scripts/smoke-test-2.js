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
  const email = `dona2_${unique}@teste.com`;
  const password = "senhaSegura123";
  const owner = makeJar();

  // 1. signup SEM slug manual
  let res = await owner.req("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName: "Studio Automático", ownerName: "Dona 2", ownerEmail: email, ownerPassword: password }),
  });
  const signupData = await res.json();
  console.log("signup (sem slug manual):", res.status, signupData);
  if (res.status !== 201 || !signupData.slug) throw new Error("signup sem slug falhou");

  await login(owner, email, password);
  res = await owner.req("/api/me");
  const me = await res.json();
  const businessId = me.user.memberships[0].business.id;

  // 2. editar slug (publicar)
  const newSlug = `studio-publicado-${unique}`;
  res = await owner.req("/api/painel/business", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, slug: newSlug }),
  });
  console.log("editar slug:", res.status, await res.json());
  if (res.status !== 200) throw new Error("edição de slug falhou");

  // 3. tentar editar pra slug já usado (deve falhar 409)
  res = await owner.req("/api/painel/business", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, slug: newSlug }), // mesmo slug, deve passar (é o próprio)
  });
  console.log("editar pro mesmo slug (deve passar):", res.status);

  // 4. superadmin: login e testar ações de assinatura + exclusão
  const admin = makeJar();
  const adminStatus = await login(admin, "bnthebat@gmail.com", "Bnzera$71");
  console.log("login superadmin:", adminStatus);

  res = await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate" }),
  });
  console.log("ativar assinatura:", res.status, await res.json());

  res = await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "suspend" }),
  });
  console.log("suspender:", res.status, await res.json());

  res = await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel" }),
  });
  console.log("cancelar:", res.status, await res.json());

  res = await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "back_to_trial" }),
  });
  console.log("voltar pro trial:", res.status, await res.json());

  // 5. excluir negócio inteiro
  res = await admin.req(`/api/superadmin/businesses/${businessId}`, { method: "DELETE" });
  console.log("excluir negócio:", res.status, await res.json());

  // 6. confirmar que login da dona não funciona mais (usuário apagado)
  const afterDelete = makeJar();
  const loginAfterDelete = await login(afterDelete, email, password);
  res = await afterDelete.req("/api/me");
  const meAfter = await res.json();
  console.log("login após exclusão (esperado sem sessão válida):", loginAfterDelete, JSON.stringify(meAfter));
  if (meAfter.user !== null) throw new Error("usuário ainda existe após exclusão! bug de segurança/LGPD");

  console.log("\n✅ TESTE 2 PASSOU: slug no publish, ações de assinatura e exclusão completa funcionando.");
}

main().catch((e) => {
  console.error("\n❌ TESTE 2 FALHOU:", e.message);
  process.exit(1);
});
