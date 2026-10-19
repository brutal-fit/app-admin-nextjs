import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BRUTAL Admin",
  description: "Internal admin panel for BRUTAL staff.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-dvh bg-bg font-sans text-text antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
