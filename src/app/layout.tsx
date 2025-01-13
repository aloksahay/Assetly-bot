import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'

export const metadata: Metadata = {
  title: "Assetly Bot",
  description: "Your DeFi Portfolio Agent",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <head />
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
} 