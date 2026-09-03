import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThLoop Atlas P&ID Lens",
  description: "Demonstração local para análise auditável de diagramas P&ID.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
