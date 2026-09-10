import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Editorial display face for headlines; clean sans for body + all numbers/tables.
// next/font self-hosts both at build time, so nothing is fetched from Google at
// runtime — the "data never leaves this device" promise holds.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InsightIQ",
  description: "Local-only AI dashboard generator. Upload a spreadsheet, get a dashboard.",
};

// Runs before paint so the saved theme is applied without a flash.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full ${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
