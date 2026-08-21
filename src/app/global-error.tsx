"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ background: "#1b1420", color: "#fff" }}>
        <div
          style={{
            display: "flex",
            minHeight: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "32px" }}>😕</p>
          <p style={{ fontSize: "18px", fontWeight: 600 }}>O Hub Beauty travou por aqui.</p>
          <p style={{ maxWidth: "320px", fontSize: "14px", opacity: 0.7 }}>
            Recarrega a página — se continuar acontecendo, chama o suporte.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "8px",
              borderRadius: "8px",
              background: "#b5567a",
              color: "#fff",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
