import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import Providers from "@/components/Providers";
import { PublicChrome } from "@/components/PublicChrome";
import ToastHost from "@/components/ToastHost";

export const metadata: Metadata = {
  title: {
    default: "Matsya: Behavioural stress analysis for goldfish",
    template: "%s | Matsya",
  },
  description:
    "Matsya analyses a short tank video, tracks every goldfish, and turns movement into a stress score with clear next steps.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><path d='M4 16C10 9 24 6 29 16C24 26 10 23 4 16Z' stroke='%234FD1C5' stroke-width='2' stroke-linecap='round'/><circle cx='23' cy='15' r='1.5' fill='%234FD1C5'/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-abyss text-ink min-h-screen selection:bg-aqua/20 selection:text-foam">
        <Providers>
          <PublicChrome>{children}</PublicChrome>
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
