const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: [],
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.log("[pageerror]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("[console.error]", msg.text());
  });

  const unique = Date.now();
  const email = `donapush${unique}@teste.com`;
  await page.goto("http://localhost:3000/cadastro");
  await page.locator("input").nth(0).fill("Push Test Salao");
  await page.locator("input").nth(1).fill("Dona Push");
  await page.locator("input").nth(2).fill(email);
  await page.locator("input").nth(3).fill("senhaSegura123");
  await page.waitForTimeout(300);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/painel\/.+\/assinatura/, { timeout: 20000 });

  const businessId = page.url().match(/painel\/([^/]+)\//)[1];
  await page.goto(`http://localhost:3000/painel/${businessId}/dashboard`);
  await page.waitForTimeout(2000);

  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("receber os agendamentos direto no celular")) {
    console.log("🟢 aviso de notificação push apareceu");
  } else {
    console.log("🔴 aviso NÃO apareceu. texto:", bodyText.slice(0, 200));
  }

  const swRegistered = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => r.active?.scriptURL);
  });
  console.log("service workers registrados:", swRegistered);

  await browser.close();
})();
