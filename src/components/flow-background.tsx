"use client";

import { useEffect, useRef } from "react";

// Fundo procedural (canvas, não gif/vídeo) — manchas de luz rosé-dourado fundindo
// devagar sobre a ameixa escura da logo. Blend "lighter" + blur é o que dá o brilho
// de aurora em vez de manchas planas/turvas.
const BLOBS = [
  { color: "#F4C7B0", radius: 0.46, speed: 0.05, phase: 0.0, orbit: 0.3 },
  { color: "#E08BA0", radius: 0.4, speed: 0.038, phase: 2.1, orbit: 0.32 },
  { color: "#D9A15C", radius: 0.22, speed: 0.065, phase: 4.4, orbit: 0.24 },
  { color: "#7A3B69", radius: 0.48, speed: 0.03, phase: 1.3, orbit: 0.34 },
];

export function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    function draw(t: number) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#140e18";
      ctx.fillRect(0, 0, width, height);

      const time = reduceMotion ? 0 : t / 1000;
      ctx.globalCompositeOperation = "lighter";
      for (const blob of BLOBS) {
        const angle = time * blob.speed + blob.phase;
        const cx = width / 2 + Math.cos(angle) * width * blob.orbit;
        const cy = height / 2 + Math.sin(angle * 1.4) * height * blob.orbit;
        const r = Math.min(width, height) * blob.radius;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, blob.color + "aa");
        grad.addColorStop(0.5, blob.color + "33");
        grad.addColorStop(1, blob.color + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw);
      }
    }

    raf = requestAnimationFrame(draw);
    if (reduceMotion) draw(0);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(60px) saturate(1.15)" }}
        aria-hidden="true"
      />
      {/* Vinheta suave — escurece as bordas pra dar profundidade e destacar o card central */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(10,7,12,0.55) 100%)",
        }}
        aria-hidden="true"
      />
      {/* Grão sutil pra tirar o aspecto "chapado" do gradiente */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />
    </>
  );
}
