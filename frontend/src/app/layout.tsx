import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Editorial serif for display headlines + a crisp sans for body/UI + a mono for
// numbers, SQL and schema detail. next/font self-hosts all three at build time,
// so nothing is fetched from Google at runtime — the local-first promise holds.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InsightIQ — AI Data Intelligence",
  description:
    "Turn raw data into decisions. Upload a spreadsheet and get an AI analytics workspace — dashboards, insights, root-cause, forecasting and recommendations, computed on your machine.",
};

// Runs before paint so the saved theme is applied without a flash. Light
// ("daylight") is the default (the :root tokens); only an explicit "dark" choice
// flips the attr. The storage key is versioned ("iq:theme") so any dark value
// left over from the earlier dark-default builds is ignored — everyone opens on
// daylight until they deliberately switch.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("iq:theme");
    if (t === "light" || t === "dark") {
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
      className={`h-full ${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
