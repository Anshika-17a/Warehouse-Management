import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AtlasStream | MongoDB Big Data Storage & Analytics Platform",
  description: "Enterprise scale data ingestion, aggregation pipelines, and analytics platform powered by MongoDB, FastAPI, and Pandas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d0f12] text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-[#f59e0b]/30 selection:text-amber-200">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-[#1e232b] bg-[#0a0c0e] py-4 text-center text-xs text-zinc-500 font-mono">
          AtlasStream Big Data Platform &bull; MongoDB Aggregation Framework &bull; PyMongo Bulk Operations &bull; Pandas Statistics
        </footer>
      </body>
    </html>
  );
}
