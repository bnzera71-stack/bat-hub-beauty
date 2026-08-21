import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const NINETY_DAYS = 60 * 60 * 24 * 90;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Sessão longa (90 dias, renovando a cada acesso) — dona de salão e Super Admin
  // não devem precisar logar de novo toda hora numa ferramenta de uso diário.
  session: { strategy: "jwt", maxAge: NINETY_DAYS, updateAge: 60 * 60 * 24 },
  secret: process.env.NEXTAUTH_SECRET,
  // Necessário fora da Vercel (Netlify, etc) — sem isso o NextAuth v5 rejeita o
  // host da requisição em produção com "UntrustedHost" e o login vira 500.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Proteção contra força bruta: por e-mail (não deixa martelar uma conta
        // específica) e por IP (não deixa um único atacante varrer várias contas).
        const ip = getClientIp(request);
        const normalizedEmail = email.toLowerCase().trim();
        const emailOk = checkRateLimit(`login-email:${normalizedEmail}`, 8, 15 * 60 * 1000);
        const ipOk = checkRateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
        if (!emailOk || !ipOk) return null;

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
