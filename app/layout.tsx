import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const Providers = dynamic(() => import("./providers"), { ssr: false });

export const metadata: Metadata = {
  title: "Guardrails — Give your AI an allowance",
  description:
    "A Move-enforced permission layer for AI agents on Sui. Set the daily budget. Sui enforces it on-chain. Every move signed, every receipt pinned forever.",
  openGraph: {
    title: "Guardrails — Give your AI an allowance",
    description: "Move-enforced spending limits for autonomous AI agents on Sui + DeepBook + Walrus.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
