"use client";

import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Clock, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Layers,
  Calendar,
  Filter
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { fetchKPISummary, KPISummary } from "@/lib/api";

const WARM_PALETTE = ["#f59e0b", "#10b981", "#d97706", "#f43f5e", "#84cc16", "#eab308"];

export default function DashboardPage() {
  const [data, setData] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (cat?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchKPISummary({ category: cat || undefined });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load analytical summary.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(categoryFilter);
  }, [categoryFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(categoryFilter);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262c36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Executive Big Data Intelligence
            <span className="text-xs px-2 py-0.5 rounded bg-[#241e12] border border-[#d97706]/40 text-[#f59e0b] font-mono font-normal">
              $facet Pipeline
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time multi-dimensional aggregations over transaction telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-[#14171c] border border-[#262c36] rounded-md px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-[#14171c] text-zinc-200">All Categories</option>
              <option value="Electronics" className="bg-[#14171c] text-zinc-200">Electronics</option>
              <option value="Industrial" className="bg-[#14171c] text-zinc-200">Industrial</option>
              <option value="Apparel" className="bg-[#14171c] text-zinc-200">Apparel</option>
              <option value="Home & Office" className="bg-[#14171c] text-zinc-200">Home & Office</option>
              <option value="Automotive" className="bg-[#14171c] text-zinc-200">Automotive</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a1e24] hover:bg-[#232932] border border-[#2c333f] text-xs text-zinc-300 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#f59e0b]" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
          <span>Error loading metrics: {error}</span>
          <button onClick={() => loadData(categoryFilter)} className="underline hover:text-red-200">Retry</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Net Revenue */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Net Revenue</span>
            <DollarSign className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-zinc-100 font-mono">
              ${data?.total_net_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Gross: ${data?.total_gross_revenue?.toLocaleString() || "0"}
            </div>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Total Orders</span>
            <Package className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-zinc-100 font-mono">
              {data?.total_transactions?.toLocaleString() || "0"}
            </div>
            <div className="text-[10px] text-[#10b981] font-mono mt-0.5">
              {data?.total_units_sold?.toLocaleString() || "0"} units fulfilled
            </div>
          </div>
        </div>

        {/* Card 3: AOV */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Avg Order Value</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-zinc-100 font-mono">
              ${data?.average_order_value?.toFixed(2) || "0.00"}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Unit yield</div>
          </div>
        </div>

        {/* Card 4: Avg Transit */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Avg Transit</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-zinc-100 font-mono">
              {data?.average_delivery_days?.toFixed(1) || "0.0"} <span className="text-xs font-normal text-zinc-400">days</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Global SLA target: 4d</div>
          </div>
        </div>

        {/* Card 5: Delay % */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Delay Ratio</span>
            <AlertTriangle className="w-4 h-4 text-[#f43f5e]" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#f43f5e] font-mono">
              {data?.delayed_percentage?.toFixed(1) || "0.0"}%
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Anomalous shipments</div>
          </div>
        </div>

        {/* Card 6: Aggregation Engine Latency */}
        <div className="p-3.5 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Mongo Latency</span>
            <Zap className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#10b981] font-mono">
              {data?.execution_time_ms || 0} <span className="text-xs font-normal text-zinc-400">ms</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">1 single round-trip</div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Time-series Daily Revenue Velocity */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Revenue & Volume Velocity</h2>
              <p className="text-[11px] text-zinc-400">Daily net transactions computed via $dateToString and $group</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> Net Revenue ($)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenue_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262c36" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => val ? val.slice(5) : ""}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c2026", borderColor: "#343a46", borderRadius: "6px", fontSize: "11px", color: "#f8fafc" }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Net Revenue"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#amberGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Status Distribution */}
        <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Fulfillment Status</h2>
            <p className="text-[11px] text-zinc-400">Order delivery lifecycle allocation</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.status_breakdown || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {(data?.status_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={WARM_PALETTE[index % WARM_PALETTE.length]} stroke="#14171c" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c2026", borderColor: "#343a46", borderRadius: "6px", fontSize: "11px", color: "#f8fafc" }}
                  formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} orders`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {(data?.status_breakdown || []).map((item, idx) => (
              <div key={item.status} className="flex items-center justify-between py-1 border-b border-[#1e232b] text-zinc-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: WARM_PALETTE[idx % WARM_PALETTE.length] }} />
                  <span className="capitalize">{item.status}</span>
                </span>
                <span className="text-zinc-400">{item.count.toLocaleString()} ({item.revenue ? `$${(item.revenue / 1000).toFixed(1)}k` : ""})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Aggregation Rows: Category & Country breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Product Categories */}
        <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Top Categories by Revenue</h2>
              <p className="text-[11px] text-zinc-400">Aggregated via MongoDB $group on product.category</p>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Profit Margin %</span>
          </div>

          <div className="space-y-3">
            {(data?.top_categories || []).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-200">{cat.category}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-zinc-400">${cat.revenue.toLocaleString()}</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#10b981]/15 text-[#10b981] text-[10px]">
                      {cat.avg_margin}% margin
                    </span>
                  </div>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-[#1e232b] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#f59e0b] h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, Math.max(5, (cat.revenue / (data?.total_net_revenue || 1)) * 100))}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Fulfillment Regions */}
        <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Regional Distribution</h2>
            <p className="text-[11px] text-zinc-400">Order revenue grouped by customer country</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top_countries || []} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262c36" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="country" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c2026", borderColor: "#343a46", borderRadius: "6px", fontSize: "11px", color: "#f8fafc" }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
