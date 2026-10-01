"use client";

import React, { useEffect, useState } from "react";
import { Layers, ShieldCheck, AlertTriangle, Zap, CheckCircle2, RefreshCw, GitBranch, Terminal } from "lucide-react";
import { fetchBenchmarkSuite, ExplainBenchmarkResult } from "@/lib/api";

export default function BenchmarkPage() {
  const [benchmarks, setBenchmarks] = useState<ExplainBenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBenchmarks = async () => {
    try {
      setLoading(true);
      const res = await fetchBenchmarkSuite();
      setBenchmarks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBenchmarks();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262c36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            MongoDB explain(&quot;executionStats&quot;) Benchmarks
            <span className="text-xs px-2 py-0.5 rounded bg-[#1c221c] border border-[#10b981]/40 text-[#10b981] font-mono font-normal">
              IXSCAN vs COLLSCAN
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Analyzing index scan boundaries, document examination ratios, and horizontal sharding scale strategy
          </p>
        </div>

        <button
          onClick={() => {
            setIsRefreshing(true);
            loadBenchmarks();
          }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1a1e24] hover:bg-[#232932] border border-[#2c333f] text-xs text-zinc-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#f59e0b]" : ""}`} />
          Re-run Explain Suite
        </button>
      </div>

      {/* Benchmark Comparisons Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#f59e0b]" />
          Production Query Execution Plans
        </h2>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#f59e0b]" />
            Running execution plan profiler across compound indexes...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {benchmarks.map((bench) => {
              const isOptimal = bench.is_optimal_index;
              return (
                <div
                  key={bench.scenario}
                  className={`p-5 rounded-lg border transition-all ${
                    isOptimal
                      ? "bg-[#14171c] border-[#262c36]"
                      : "bg-[#1f1416] border-rose-900/60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262c36]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {bench.query_description}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isOptimal
                              ? "bg-emerald-950/60 text-[#10b981] border border-emerald-800/60"
                              : "bg-rose-950/60 text-[#f43f5e] border border-rose-800/60"
                          }`}
                        >
                          Stage: {bench.execution_stage}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-1">
                        Filter: <code className="text-amber-300">{bench.query_filter}</code>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-lg font-bold text-zinc-100">
                        {bench.execution_time_ms} ms
                      </div>
                      <div className="text-[10px] text-zinc-500">Execution Latency</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 font-mono text-xs">
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Index Leveraged</span>
                      <span className="text-zinc-200 font-semibold">{bench.index_used}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Returned Documents</span>
                      <span className="text-emerald-400 font-bold">{bench.n_returned.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Examined in Storage</span>
                      <span className={isOptimal ? "text-zinc-300" : "text-[#f43f5e] font-bold"}>
                        {bench.total_docs_examined.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] block">Efficiency Ratio</span>
                      <span
                        className={`font-bold ${
                          bench.efficiency_ratio <= 1.5 ? "text-[#10b981]" : "text-[#f43f5e]"
                        }`}
                      >
                        {bench.efficiency_ratio}x docs / result
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sharding Architecture Blueprint Section */}
      <div className="p-6 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#f59e0b]" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Horizontal Sharding Strategy (Scale Beyond Single Replica Sets)
          </h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          When dataset volume grows into the tens or hundreds of millions of documents (exceeding single-node RAM for index working sets), MongoDB horizontal sharding is deployed across multiple shards.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Strategy A: Hashed Sharding */}
          <div className="p-4 rounded bg-[#0d0f12] border border-[#262c36] space-y-2 text-xs">
            <div className="font-semibold text-[#f59e0b] font-mono flex items-center justify-between">
              <span>Hashed Sharding</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#241e12] border border-[#d97706]/40">
                Write-Heavy
              </span>
            </div>
            <code className="block text-[11px] font-mono text-zinc-300 bg-[#161a22] p-2 rounded">
              sh.shardCollection(&quot;bigdata.transactions&quot;, &#123; &quot;transaction_id&quot;: &quot;hashed&quot; &#125;)
            </code>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              <strong>Trade-off:</strong> Uniformly distributes high-velocity bulk inserts across all shards without hotspotting. However, range queries across timestamps require multi-shard scatter-gather queries.
            </p>
          </div>

          {/* Strategy B: Compound Ranged Sharding */}
          <div className="p-4 rounded bg-[#0d0f12] border border-[#262c36] space-y-2 text-xs">
            <div className="font-semibold text-[#10b981] font-mono flex items-center justify-between">
              <span>Compound Ranged Sharding</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c221c] border border-[#10b981]/40">
                Analytical-Heavy
              </span>
            </div>
            <code className="block text-[11px] font-mono text-zinc-300 bg-[#161a22] p-2 rounded">
              sh.shardCollection(&quot;bigdata.transactions&quot;, &#123; &quot;customer.country&quot;: 1, &quot;timestamp&quot;: 1 &#125;)
            </code>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              <strong>Trade-off:</strong> Enables targeted queries by routing regional analytical aggregations directly to the specific shard holding that country&#39;s data chunks, achieving maximum read throughput.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
