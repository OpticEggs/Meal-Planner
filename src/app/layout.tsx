import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = { title: "Table", description: "Private shared dinner planning for two" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf6f0" }, { media: "(prefers-color-scheme: dark)", color: "#171410" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
