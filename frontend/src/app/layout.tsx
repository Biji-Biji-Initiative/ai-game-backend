import type { Metadata } from "next";
import "./globals.css";
import "@/styles/accessibility.css";

// Import the client wrapper component
import ClientWrapper from "./layout-client";

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
    <html lang="en" className="h-full">
      <body className="font-sans antialiased h-full">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
