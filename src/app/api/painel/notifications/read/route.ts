import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

const bodySchema = z.object({
  businessId: z.string().min(1),
  id: z.string().min(1).optional(), // omitido = marca todas como lidas
});

export async function PATCH(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    await requireBusinessAccess(body.businessId);

    await prisma.notification.updateMany({
      where: {
        businessId: body.businessId,
        readAt: null,
        ...(body.id ? { id: body.id } : {}),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
