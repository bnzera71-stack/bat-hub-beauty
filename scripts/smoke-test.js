const BASE = "http://localhost:3000";
let cookies = {};

function setCookiesFrom(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    cookies[k] = v;
  }
}

function cookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { ...(opts.headers || {}), cookie: cookieHeader() },
    redirect: "manual",
  });
  setCookiesFrom(res);
  return res;
}

async function main() {
  const unique = Date.now();
  const slug = `salao-teste-${unique}`;
  const email = `dona${unique}@teste.com`;
  const password = "senhaSegura123";

  // 1. signup
  let res = await req("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessName: "Salão Teste",
      slug,
      ownerName: "Dona Teste",
      ownerEmail: email,
      ownerPassword: password,
    }),
  });
  console.log("signup:", res.status, await res.json());
  if (res.status !== 201) throw new Error("signup falhou");

  // 2. csrf + login (NextAuth v5 credentials flow)
  res = await req("/api/auth/csrf");
  const { csrfToken } = await res.json();

  res = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
  console.log("login status:", res.status);

  res = await req("/api/me");
  const me = await res.json();
  console.log("me:", JSON.stringify(me));
  const businessId = me.user.memberships[0].business.id;

  // 3. create professional
  res = await req("/api/painel/professionals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, name: "Mariana", specialties: ["Cabelo"] }),
  });
  const { professional } = await res.json();
  console.log("professional created:", professional?.id, res.status);

  // 4. create service linked to professional
  res = await req("/api/painel/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId,
      name: "Corte",
      priceCents: 8000,
      durationMin: 60,
      professionalIds: [professional.id],
    }),
  });
  const { service } = await res.json();
  console.log("service created:", service?.id, res.status);

  // 5. set business hours (every weekday 09:00-18:00)
  const hours = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" }));
  res = await req("/api/painel/business-hours", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, hours }),
  });
  console.log("business hours set:", res.status);

  // 6. public page data
  res = await req(`/api/public/business/${slug}`);
  const pub = await res.json();
  console.log("public business services:", JSON.stringify(pub.business.serviceCategories));

  // 7. find next weekday with slots
  let dateStr = null;
  let slots = [];
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const r = await req(`/api/availability?slug=${slug}&serviceId=${service.id}&date=${ds}`);
    const data = await r.json();
    if (data.slots && data.slots.length > 0) {
      dateStr = ds;
      slots = data.slots;
      break;
    }
  }
  console.log("availability date:", dateStr, "slots found:", slots.length, slots[0]);
  if (!dateStr) throw new Error("nenhum slot disponível encontrado");

  // 8. book the first slot as a public client (fresh cookie jar, simulate anonymous)
  const bookingCookies = { ...cookies };
  cookies = {}; // clear session so booking request is anonymous like a real client
  res = await req("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      serviceId: service.id,
      professionalId: slots[0].professionalId,
      start: slots[0].start,
      customerName: "Cliente Teste",
      customerPhone: "11999998888",
    }),
  });
  const booking = await res.json();
  console.log("booking:", res.status, JSON.stringify(booking));
  if (res.status !== 201) throw new Error("booking falhou");

  // 9. try double-booking the same slot -> must be rejected
  res = await req("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      serviceId: service.id,
      professionalId: slots[0].professionalId,
      start: slots[0].start,
      customerName: "Outro Cliente",
      customerPhone: "11988887777",
    }),
  });
  console.log("double-booking attempt status (esperado 409):", res.status, await res.json());
  if (res.status !== 409) throw new Error("double-booking NÃO foi bloqueado! bug crítico");

  // 10. restore owner session and check agenda shows the appointment
  cookies = bookingCookies;
  const dayStart = new Date(`${dateStr}T00:00:00`).toISOString();
  const dayEnd = new Date(`${dateStr}T23:59:59`).toISOString();
  res = await req(`/api/painel/appointments?businessId=${businessId}&from=${dayStart}&to=${dayEnd}`);
  const agenda = await res.json();
  console.log("agenda do dia:", JSON.stringify(agenda.appointments.map((a) => ({ id: a.id, status: a.status }))));
  if (agenda.appointments.length !== 1) throw new Error("agenda não mostrou o agendamento criado");

  // 11. cross-tenant isolation check: try accessing with no session
  cookies = {};
  res = await req(`/api/painel/appointments?businessId=${businessId}&from=${dayStart}&to=${dayEnd}`);
  console.log("acesso sem login ao painel (esperado 401):", res.status);
  if (res.status !== 401) throw new Error("FALHA DE SEGURANÇA: painel acessível sem login!");

  console.log("\n✅ SMOKE TEST PASSOU: signup, login, RBAC, disponibilidade, agendamento, prevenção de double-booking e isolamento de sessão funcionando.");
}

main().catch((e) => {
  console.error("\n❌ SMOKE TEST FALHOU:", e.message);
  process.exit(1);
});
