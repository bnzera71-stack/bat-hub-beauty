import webPush from "web-push";
import { prisma } from "@/lib/db";

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublic && vapidPrivate && vapidSubject) {
  webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

// Notificação push de verdade (cai no celular mesmo com o app fechado). Se as
// chaves VAPID não estiverem configuradas, simplesmente não faz nada — o resto
// do app continua funcionando normal (badge/lista no painel já cobrem isso).
export async function sendPushToBusiness(
  businessId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { businessId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Inscrição expirada/revogada — limpa pra não tentar de novo à toa.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("[push] falha ao enviar:", error);
        }
      }
    })
  );
}
