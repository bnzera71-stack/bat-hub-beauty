import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireBusinessAccess } from "@/lib/tenant";
import { errorResponse } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;

// Não confia na extensão nem no content-type declarado pelo navegador — confere
// os bytes reais do arquivo (magic numbers) antes de aceitar o upload.
function sniffImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const businessId = String(form.get("businessId") ?? "");
    const file = form.get("file");

    await requireBusinessAccess(businessId, ["OWNER", "MANAGER"]);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo de 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = sniffImageType(buffer);
    if (!type) {
      return NextResponse.json({ error: "Só aceitamos imagens JPEG, PNG ou WEBP." }, { status: 400 });
    }

    const path = `${businessId}/${randomUUID()}.${type.ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("photos")
      .upload(path, buffer, { contentType: type.mime, cacheControl: "31536000" });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("photos").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
