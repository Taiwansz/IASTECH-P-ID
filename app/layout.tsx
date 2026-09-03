import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rastro — P&ID Lens",
  description: "Análise local e auditável de diagramas P&ID, com evidências, rotas e revisão humana.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand/marks/rastro-app-icon.svg",
    shortcut: "/brand/png/favicon-32.png",
    apple: "/brand/png/apple-touch-icon-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
