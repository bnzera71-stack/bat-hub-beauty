import { NextResponse } from "next/server";
import { HttpError } from "@/lib/tenant";

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { error: "Erro interno. Tente novamente." },
    { status: 500 }
  );
}
