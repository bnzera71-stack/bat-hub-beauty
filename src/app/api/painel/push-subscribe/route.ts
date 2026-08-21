import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  businessId: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const access = await requireBusinessAccess(body.businessId);

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.subscription.endpoint },
      update: { businessId: body.businessId, userId: access.userId },
      create: {
        businessId: body.businessId,
        userId: access.userId,
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}

const deleteSchema = z.object({
  endpoint: z.string().url(),
});

export async function DELETE(req: NextRequest) {
  try {
    const body = deleteSchema.parse(await req.json());
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
