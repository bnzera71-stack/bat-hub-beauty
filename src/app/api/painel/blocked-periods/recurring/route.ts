import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

const MAX_OCCURRENCES = 366;

// O cliente (navegador) já sabe o fuso horário local de quem está preenchendo o
// formulário — recebemos os instantes já calculados em vez de tentar reconstruir
// "meio-dia local" no servidor, que não tem por que rodar no mesmo fuso do salão.
const createSchema = z.object({
  businessId: z.string().min(1),
  professionalId: z.string().optional(),
  occurrences: z
    .array(z.object({ startAt: z.string().datetime(), endAt: z.string().datetime() }))
    .min(1)
    .max(MAX_OCCURRENCES),
  reason: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    await requireBusinessAccess(body.businessId, ["OWNER", "MANAGER", "PROFESSIONAL"]);

    for (const o of body.occurrences) {
      if (new Date(o.endAt) <= new Date(o.startAt)) {
        return NextResponse.json({ error: "O fim precisa ser depois do início." }, { status: 400 });
      }
    }

    const batchId = randomUUID();
    await prisma.blockedPeriod.createMany({
      data: body.occurrences.map((o) => ({
        businessId: body.businessId,
        professionalId: body.professionalId,
        startAt: new Date(o.startAt),
        endAt: new Date(o.endAt),
        reason: body.reason,
        batchId,
      })),
    });

    return NextResponse.json({ batchId, count: body.occurrences.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return errorResponse(error);
  }
}
