import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import { GeistSans } from "geist/font/sans";
import "./tailwind.css";
import "./globals.css";

export const metadata: Metadata = { title: "Table", description: "Private shared dinner planning for two" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f0e0c", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
