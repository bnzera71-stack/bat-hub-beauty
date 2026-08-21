import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que o tracing do build inclua o projeto inteiro por causa do acesso a
  // filesystem dinâmico do engine do Prisma (ver aviso do build).
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
