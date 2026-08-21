import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings";

// Só o que é seguro expor sem login (usado pela bolinha de WhatsApp nas telas
// públicas de entrada) — nunca a chave PIX nem preço aqui.
export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({ whatsapp: settings.supportWhatsapp });
}
