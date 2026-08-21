const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on("console", (msg) => {
    console.log(`[console.${msg.type()}]`, msg.text());
  });
  page.on("pageerror", (err) => {
    console.log("[pageerror]", err.message);
    console.log(err.stack);
  });
  page.on("requestfailed", (req) => {
    console.log("[requestfailed]", req.url(), req.failure()?.errorText);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) console.log("[http-error]", res.status(), res.url());
  });

  const unique = Date.now();
  const email = `donadebug${unique}@teste.com`;
  const password = "senhaSegura123";

  await page.goto("http://localhost:3000/cadastro");
  await page.locator("input").nth(0).fill("Debug Salao");
  await page.locator("input").nth(1).fill("Dona Debug");
  await page.locator("input").nth(2).fill(email);
  await page.locator("input").nth(3).fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/painel\/.+\/assinatura/, { timeout: 15000 });
  console.log("chegou na assinatura:", page.url());

  await page.waitForTimeout(2000);

  const businessId = page.url().match(/painel\/([^/]+)\//)[1];
  console.log("navegando direto pro dashboard...");
  await page.goto(`http://localhost:3000/painel/${businessId}/dashboard`);
  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").innerText();
  console.log("\n--- TEXTO DA PÁGINA ---");
  console.log(bodyText.slice(0, 500));

  await browser.close();
})();
