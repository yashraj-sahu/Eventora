import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { GlobalFloatingChatbot } from "@/components/ai/GlobalFloatingChatbot";

export const metadata: Metadata = {
  title: "EVNTORA — Every Celebration, Beautifully Planned",
  description:
    "India's premier AI-powered event planning and luxury vendor marketplace for weddings, royal galas, and bespoke celebrations.",
  verification: {
    google: "7CWlGR9FChJOtTIeTtg2dZczL20oW9fMW_TzM9ajWOY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('evntora-theme');
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] selection:bg-[#681B1D] selection:text-[#FFF3E3] font-sans transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <GlobalFloatingChatbot />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
