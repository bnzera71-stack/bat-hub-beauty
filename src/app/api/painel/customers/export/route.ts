import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
    await requireBusinessAccess(businessId);

    const customers = await prisma.customer.findMany({
      where: { businessId },
      include: {
        appointments: {
          orderBy: { startAt: "desc" },
          take: 1,
          select: { startAt: true },
        },
        _count: { select: { appointments: true } },
      },
      orderBy: { name: "asc" },
    });

    const header = ["Nome", "Telefone", "Total de atendimentos", "Último atendimento"];
    const rows = customers.map((c) => [
      c.name,
      c.phone,
      String(c._count.appointments),
      c.appointments[0] ? new Date(c.appointments[0].startAt).toLocaleDateString("pt-BR") : "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\r\n");
    const csvWithBom = "﻿" + csv;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clientes.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
