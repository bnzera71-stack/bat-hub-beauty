// Netlify Scheduled Function (mecanismo estável, não o experimental do Next.js
// Route Handler) — só dispara a rota que tem a lógica de verdade, testável
// isoladamente via GET /api/cron/send-reminders?secret=...
export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("[send-reminders-cron] URL ou CRON_SECRET ausente.");
    return new Response("missing config", { status: 500 });
  }

  const res = await fetch(`${base}/api/cron/send-reminders?secret=${encodeURIComponent(secret)}`);
  const body = await res.text();
  console.log("[send-reminders-cron]", res.status, body);
  return new Response("ok");
};

export const config = {
  schedule: "0 * * * *",
};
