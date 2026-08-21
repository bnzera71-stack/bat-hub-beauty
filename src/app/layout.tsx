import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hub Beauty",
  description: "Agendamento online e gestão para salões e profissionais da beleza.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hub Beauty",
  },
  icons: {
    apple: "/logo-hub-beauty.png",
  },
};

// viewportFit: "cover" é o que faz o fundo ir por baixo da barra de status e do
// home indicator no iPhone — sem isso sobra faixa branca em cima/embaixo.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b1420",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
