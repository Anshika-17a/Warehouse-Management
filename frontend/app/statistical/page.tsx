"use client";

import React, { useEffect, useState } from "react";
import { Cpu, AlertTriangle, TrendingUp, RefreshCw, BarChart2, CheckCircle2 } from "lucide-react";
import { fetchAdvancedStats, AdvancedStats } from "@/lib/api";

export default function StatisticalLabPage() {
  const [data, setData] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sampleLimit, setSampleLimit] = useState(25000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = async (limit = sampleLimit) => {
    try {
      setLoading(true);
      const res = await fetchAdvancedStats(limit);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [sampleLimit]);

  const getHeatmapColor = (val: number) => {
    if (val === 1) return "bg-[#241e12] text-[#f59e0b] font-bold";
    if (val > 0.4) return "bg-[#1f291e] text-[#10b981]";
    if (val > 0.1) return "bg-[#141e15] text-[#10b981]/80";
    if (val < -0.3) return "bg-[#2d1519] text-[#f43f5e]";
    if (val < -0.1) return "bg-[#1f1315] text-[#f43f5e]/80";
    return "bg-[#0d0f12] text-zinc-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262c36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Pandas Heavy Statistical Analytics
            <span className="text-xs px-2 py-0.5 rounded bg-[#241e12] border border-[#d97706]/40 text-[#f59e0b] font-mono font-normal">
              PyMongo &bull; Pandas &bull; NumPy
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Offloading ML-grade correlation matrix and IQR outlier detection from MongoDB into high-performance Pandas DataFrames
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">Sample Depth:</span>
            <select
              value={sampleLimit}
              onChange={(e) => setSampleLimit(Number(e.target.value))}
              className="bg-[#14171c] border border-[#262c36] rounded px-3 py-1.5 text-zinc-200"
            >
              <option value={10000}>10,000 docs</option>
              <option value={25000}>25,000 docs</option>
              <option value={50000}>50,000 docs</option>
            </select>
          </div>

          <button
            onClick={() => {
              setIsRefreshing(true);
              loadStats();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a1e24] hover:bg-[#232932] border border-[#2c333f] text-xs text-zinc-300 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#f59e0b]" : ""}`} />
            Recompute
          </button>
        </div>
      </div>

      {/* Latency & Telemetry Banner */}
      {data && (
        <div className="p-4 rounded-lg bg-[#14171c] border border-[#262c36] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <Cpu className="w-4 h-4 text-[#f59e0b]" />
            <span>Sample Analyzed: <strong className="text-zinc-100">{data.sample_analyzed.toLocaleString()}</strong> records</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>PyMongo Stream Transfer: <span className="text-[#10b981] font-semibold">{data.data_transfer_time_ms} ms</span></span>
            <span>Pandas Compute Time: <span className="text-[#f59e0b] font-semibold">{data.total_compute_time_ms} ms</span></span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#f59e0b]" />
          Streaming dataset from MongoDB into Pandas memory buffer...
        </div>
      ) : data?.correlation ? (
        <div className="space-y-6">
          {/* Section 1: Multivariate Correlation Matrix */}
          <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Multivariate Pearson Correlation Matrix</h2>
              <p className="text-[11px] text-zinc-400">
                Measures linear dependency across revenue, discount rates, transit durations, and logistical delays.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-center">
                <thead>
                  <tr className="border-b border-[#262c36] text-zinc-400">
                    <th className="py-2.5 px-3 text-left">Metric Variable</th>
                    {data.correlation.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 uppercase text-[10px] tracking-wider">
                        {col.replace("_", " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232b]">
                  {data.correlation.columns.map((rowName) => (
                    <tr key={rowName}>
                      <td className="py-2.5 px-3 text-left font-semibold text-zinc-300 capitalize">
                        {rowName.replace("_", " ")}
                      </td>
                      {data.correlation.columns.map((colName) => {
                        const val = data.correlation.matrix[rowName]?.[colName] ?? 0;
                        return (
                          <td key={colName} className={`py-2.5 px-3 ${getHeatmapColor(val)}`}>
                            {val.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: IQR Outlier Detection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(data.outliers).map(([metricName, stats]) => (
              <div key={metricName} className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 capitalize">
                      {metricName.replace("_", " ")} IQR Outliers
                    </h3>
                    <p className="text-[11px] text-zinc-400">Tukey&#39;s Fences (1.5 &times; IQR threshold)</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-950/50 border border-rose-800/60 text-[#f43f5e] font-mono text-xs">
                    {stats.outlier_percentage}% Outliers
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#0d0f12] p-3 rounded border border-[#262c36]">
                  <div>
                    <div className="text-[10px] text-zinc-500">25th Percentile (Q1)</div>
                    <div className="text-zinc-200 font-bold">{stats.q25}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">75th Percentile (Q3)</div>
                    <div className="text-zinc-200 font-bold">{stats.q75}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Upper Fence Limit</div>
                    <div className="text-[#f59e0b] font-bold">{stats.upper_threshold}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-400">Extreme Outlier Samples Detected:</div>
                  <div className="space-y-1 text-[11px] font-mono">
                    {stats.extreme_examples.map((item, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#0d0f12] border border-[#1e232b] flex items-center justify-between text-zinc-300">
                        <span className="text-zinc-400">{item.category}</span>
                        <span>Rev: <strong className="text-zinc-200">${item.net_revenue}</strong></span>
                        <span>Delivery: <strong className="text-[#f43f5e]">{item.delivery_days}d</strong></span>
                        <span>Disc: {item.discount_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-zinc-400">No data found to compute statistics.</div>
      )}
    </div>
  );
}
