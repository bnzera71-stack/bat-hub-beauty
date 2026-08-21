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
  const email = `dona4_${unique}@teste.com`;
  const password = "senhaSegura123";
  const owner = makeJar();

  let res = await owner.req("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName: "Studio Notif", ownerName: "Dona 4", ownerEmail: email, ownerPassword: password }),
  });
  const signupData = await res.json();
  const businessId = signupData.businessId;
  const slug = signupData.slug;
  console.log("signup:", res.status, slug);

  await login(owner, email, password);

  const admin = makeJar();
  await login(admin, "bnthebat@gmail.com", "Bnzera$71");
  await admin.req(`/api/superadmin/businesses/${businessId}/subscription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "activate" }),
  });

  res = await owner.req("/api/painel/professionals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, name: "Julia", specialties: [] }),
  });
  const { professional } = await res.json();

  res = await owner.req("/api/painel/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, name: "Escova", priceCents: 5000, durationMin: 30, professionalIds: [professional.id] }),
  });
  const { service } = await res.json();

  const hours = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" }));
  await owner.req("/api/painel/business-hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, hours }),
  });

  // notificações deve estar vazio antes de qualquer agendamento
  res = await owner.req(`/api/painel/notifications?businessId=${businessId}`);
  let notifData = await res.json();
  console.log("notificações antes:", notifData.unreadCount, notifData.notifications.length);

  // cliente público agenda
  let dateStr, slots;
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const r = await owner.req(`/api/availability?slug=${slug}&serviceId=${service.id}&date=${ds}`);
    const data = await r.json();
    if (data.slots?.length) { dateStr = ds; slots = data.slots; break; }
  }
  const anon = makeJar();
  res = await anon.req("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug, serviceId: service.id, professionalId: slots[0].professionalId, start: slots[0].start,
      customerName: "Camila Notificação", customerPhone: "11977776666",
    }),
  });
  console.log("booking:", res.status);

  // notificação deve existir agora, não lida, com descrição legível
  res = await owner.req(`/api/painel/notifications?businessId=${businessId}`);
  notifData = await res.json();
  console.log("notificações depois:", JSON.stringify(notifData));
  if (notifData.unreadCount < 1) throw new Error("BUG: notificação não foi criada");
  const n = notifData.notifications[0];
  if (n.payload.customerName !== "Camila Notificação" || !n.payload.serviceName) {
    throw new Error("BUG: payload da notificação incompleto: " + JSON.stringify(n.payload));
  }
  if (n.readAt !== null) throw new Error("BUG: notificação nasceu já lida");

  // marcar como lida
  res = await owner.req("/api/painel/notifications/read", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, id: n.id }),
  });
  console.log("marcar como lida:", res.status);

  res = await owner.req(`/api/painel/notifications?businessId=${businessId}`);
  notifData = await res.json();
  console.log("unreadCount após marcar lida (esperado 0):", notifData.unreadCount);
  if (notifData.unreadCount !== 0) throw new Error("BUG: notificação não marcou como lida");

  // limpeza
  await admin.req(`/api/superadmin/businesses/${businessId}`, { method: "DELETE" });

  console.log("\n✅ TESTE 4 PASSOU: sistema de notificação de novo agendamento funcionando.");
}

main().catch((e) => {
  console.error("\n❌ TESTE 4 FALHOU:", e.message);
  process.exit(1);
});
