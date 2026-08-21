"use client";

import { useRef, useState } from "react";

export function ImageUploader({
  businessId,
  currentUrl,
  onUploaded,
  shape = "square",
}: {
  businessId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  shape?: "square" | "wide";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("businessId", businessId);
    formData.append("file", file);
    const res = await fetch("/api/painel/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível enviar a imagem.");
      return;
    }
    onUploaded(data.url);
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 hover:border-accent ${
          shape === "square" ? "h-24 w-24" : "h-28 w-full"
        }`}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Sem foto</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 group-hover:opacity-100">
          {uploading ? "Enviando..." : currentUrl ? "Trocar foto" : "Adicionar foto"}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
