import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KrishiSaarthi AI - Precision Agriculture Platform",
  description: "AI-powered precision farming, GIS fields mapping, moisture stress analysis, and multilingual chatbot advisory.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KrishiSaarthi AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#06090e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-brand-bg text-slate-100 font-sans selection:bg-brand-primary/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
