"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, Activity, Cpu, Layers, HardDrive, BarChart3, Search, UploadCloud } from "lucide-react";
import { fetchCollectionHealth } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<{ database: string; database_name: string; batch_size: number } | null>(null);

  useEffect(() => {
    fetchCollectionHealth()
      .then(setHealth)
      .catch(() => setHealth({ database: "offline", database_name: "bigdata_analytics", batch_size: 10000 }));
  }, []);

  const navLinks = [
    { href: "/", label: "Executive Analytics", icon: BarChart3 },
    { href: "/query", label: "Query Explorer", icon: Search },
    { href: "/ingest", label: "Ingestion Engine", icon: UploadCloud },
    { href: "/statistical", label: "Statistical Lab", icon: Cpu },
    { href: "/benchmark", label: "Explain & Sharding", icon: Layers },
  ];

  return (
    <header className="border-b border-[#262c36] bg-[#111317] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#241e12] border border-[#d97706]/40 flex items-center justify-center text-[#f59e0b]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-100 font-mono">
                  Atlas<span className="text-[#f59e0b]">Stream</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e241c] text-[#10b981] font-mono border border-[#10b981]/30">
                  PyMongo 4.x
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">MongoDB Big Data Storage & Aggregations</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#241e12] text-[#f59e0b] border border-[#d97706]/50 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e24]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Cluster Status Widget */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 rounded bg-[#14171c] border border-[#262c36] text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    health?.database === "healthy" ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    health?.database === "healthy" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </span>
              <span className="text-zinc-300">
                {health?.database === "healthy" ? "MongoDB 6.0 Online" : "Connecting..."}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400 text-[11px]">
                Batch: {health?.batch_size?.toLocaleString() || "10,000"} docs
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
