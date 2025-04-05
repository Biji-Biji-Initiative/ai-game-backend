import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";

// Import the client wrapper component directly from features
import ClientWrapper from "@/features/layout/ClientWrapper";

// Setup Inter font with next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "AI Fight Club - Human Edge Competitive Analysis",
  description: "Discover Your Competitive Advantage in the Age of AI",
  keywords: "AI, artificial intelligence, human skills, future of work, competitive advantage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="font-sans antialiased h-full">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
