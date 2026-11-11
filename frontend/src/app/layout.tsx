import type { Metadata } from "next";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastHost from "@/components/ToastHost";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Meets Aqua - Catch goldfish stress before it spreads",
  description: "Upload a tank video. Get a stress score for every fish, and clear actions to take.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐟</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-abyss text-ink min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
