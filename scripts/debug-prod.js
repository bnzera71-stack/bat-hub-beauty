const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") console.log(`[console.${msg.type()}]`, msg.text());
  });
  page.on("pageerror", (err) => {
    console.log("[pageerror]", err.message);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) console.log("[http-error]", res.status(), res.url());
  });

  const BASE = "https://hubbeauty-app.netlify.app";
  const unique = Date.now();
  const email = `donaprodbug${unique}@teste.com`;
  const password = "senhaSegura123";

  await page.goto(BASE + "/cadastro");
  await page.locator("input").nth(0).fill("Debug Prod Salao");
  await page.locator("input").nth(1).fill("Dona Debug");
  await page.locator("input").nth(2).fill(email);
  await page.locator("input").nth(3).fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/painel\/.+\/assinatura/, { timeout: 20000 });
  console.log("chegou na assinatura:", page.url());
  await page.waitForTimeout(2000);

  const businessId = page.url().match(/painel\/([^/]+)\//)[1];

  for (const tab of ["dashboard", "agenda", "clientes", "configuracoes", "assinatura"]) {
    console.log(`\n--- indo pra ${tab} ---`);
    await page.goto(`${BASE}/painel/${businessId}/${tab}`);
    await page.waitForTimeout(2500);
    const bodyText = await page.locator("body").innerText();
    if (bodyText.toLowerCase().includes("deu um erro aqui") || bodyText.toLowerCase().includes("algo deu errado")) {
      console.log(`🔴 ERRO em ${tab}!`);
    } else {
      console.log(`🟢 ${tab} ok`);
    }
  }

  await browser.close();
})();
