import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WhisperPreloader } from "@/components/providers/WhisperPreloader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Tutor - Language Practice",
  description: "Practice speaking languages with AI-powered voice conversations. Get instant feedback on grammar, vocabulary, and pronunciation.",
  keywords: ["language learning", "AI tutor", "voice practice", "English learning", "speech recognition"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <WhisperPreloader />
        {children}
      </body>
    </html>
  );
}

