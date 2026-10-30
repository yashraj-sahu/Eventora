import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Evntora | AI-Powered Event Planning & Vendor Marketplace",
  description:
    "Plan luxury weddings, corporate galas, and bespoke celebrations across India with intelligent AI blueprints and top-tier vendors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#090a0f] text-slate-100 selection:bg-amber-500 selection:text-black">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
