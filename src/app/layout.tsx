import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://bharath-portfolio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bharath Genji Mohanaranga — AI Engineer",
  description:
    "AI Engineer shipping production multi-agent systems. LangGraph & Google ADK orchestration, RAG pipelines, and cross-cloud MLOps on GCP, AWS & Azure. With a live AI/tech news stream.",
  keywords: [
    "AI Engineer",
    "Multi-agent systems",
    "LangGraph",
    "RAG",
    "MLOps",
    "Bharath Genji Mohanaranga",
  ],
  authors: [{ name: "Bharath Genji Mohanaranga" }],
  openGraph: {
    title: "Bharath Genji Mohanaranga — AI Engineer",
    description:
      "Production multi-agent systems, RAG pipelines & cross-cloud MLOps. Plus a live AI/tech news stream.",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Bharath Genji Mohanaranga — AI Engineer",
    description:
      "Production multi-agent systems, RAG pipelines & cross-cloud MLOps.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <div className="grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
