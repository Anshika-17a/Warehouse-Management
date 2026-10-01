"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Code, Zap, RefreshCw, X } from "lucide-react";
import { fetchPaginatedTransactions, PaginatedResult, Transaction } from "@/lib/api";

export default function QueryExplorerPage() {
  const [data, setData] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Transaction | null>(null);

  // Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState(-1);

  const executeQuery = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await fetchPaginatedTransactions({
        page: targetPage,
        limit,
        category: category || undefined,
        country: country || undefined,
        status: status || undefined,
        min_amount: minAmount ? parseFloat(minAmount) : undefined,
        max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setData(res);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeQuery(1);
  }, [category, country, status, limit, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(1);
  };

  const resetFilters = () => {
    setCategory("");
    setCountry("");
    setStatus("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setSortBy("timestamp");
    setSortOrder(-1);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262c36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Compound Query Explorer
            <span className="text-xs px-2 py-0.5 rounded bg-[#1c221c] border border-[#10b981]/40 text-[#10b981] font-mono font-normal">
              Indexed Cursor
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Server-side paginated queries leveraging ESR compound index bounds
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-[#14171c] border border-[#262c36] text-zinc-300">
              Examined in <span className="text-[#10b981] font-bold">{data.query_execution_time_ms}ms</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[#14171c] border border-[#262c36] text-zinc-300">
              Total Matches: <span className="text-[#f59e0b] font-bold">{data.total_count.toLocaleString()}</span>
            </span>
          </div>
        )}
      </div>

      {/* Filter Builder Panel */}
      <div className="p-4 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search TX-ID, SKU, Order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#0d0f12] border border-[#262c36] rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#d97706]"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#0d0f12] border border-[#262c36] rounded-md text-zinc-200 focus:outline-none focus:border-[#d97706]"
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Industrial">Industrial</option>
            <option value="Apparel">Apparel</option>
            <option value="Home & Office">Home & Office</option>
            <option value="Automotive">Automotive</option>
          </select>

          {/* Country */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#0d0f12] border border-[#262c36] rounded-md text-zinc-200 focus:outline-none focus:border-[#d97706]"
          >
            <option value="">All Countries</option>
            <option value="USA">USA</option>
            <option value="Germany">Germany</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Japan">Japan</option>
            <option value="Canada">Canada</option>
            <option value="France">France</option>
            <option value="Australia">Australia</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#0d0f12] border border-[#262c36] rounded-md text-zinc-200 focus:outline-none focus:border-[#d97706]"
          >
            <option value="">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="in_transit">In Transit</option>
            <option value="pending">Pending</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-md bg-[#241e12] hover:bg-[#2d2516] border border-[#d97706]/50 text-[#f59e0b] text-xs font-medium cursor-pointer transition-all"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 rounded-md bg-[#1c2026] hover:bg-[#262c36] text-zinc-400 text-xs cursor-pointer transition-all"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Paginated Data Table */}
      <div className="rounded-lg bg-[#14171c] border border-[#262c36] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0f1115] text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#262c36]">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Category & SKU</th>
                <th className="py-3 px-4">Customer & Country</th>
                <th className="py-3 px-4 text-right">Net Revenue</th>
                <th className="py-3 px-4">Status & SLA</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e232b] text-zinc-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#f59e0b]" />
                      Querying indexed collection...
                    </div>
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No transactions match current filter criteria.
                  </td>
                </tr>
              ) : (
                data?.items?.map((item) => (
                  <tr key={item.transaction_id} className="hover:bg-[#1a1e24] transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-200">
                      {item.transaction_id}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-200 font-sans">{item.product.category}</div>
                      <div className="text-[10px] text-zinc-500">{item.product.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-200 font-sans">{item.customer.customer_id}</div>
                      <div className="text-[10px] text-zinc-500">{item.customer.country} &bull; {item.customer.segment}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#f59e0b]">
                      ${item.metrics.net_amount.toFixed(2)}
                      <div className="text-[10px] text-zinc-500 font-normal">
                        Qty: {item.metrics.quantity} &bull; Disc: {item.metrics.discount_percent}%
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.fulfillment.status === "delivered"
                              ? "bg-emerald-500"
                              : item.fulfillment.status === "in_transit"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="capitalize font-sans text-xs">{item.fulfillment.status}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {item.fulfillment.delivery_days} days {item.fulfillment.delayed && <span className="text-[#f43f5e] font-semibold">(Delayed)</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedDoc(item)}
                        className="p-1.5 rounded hover:bg-[#252c36] text-zinc-400 hover:text-zinc-100 transition-colors"
                        title="View Embedded BSON Structure"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f1115] border-t border-[#262c36] text-xs font-mono">
          <div className="flex items-center gap-3 text-zinc-400">
            <span>
              Page <span className="text-zinc-200 font-semibold">{page}</span> of{" "}
              <span className="text-zinc-200 font-semibold">{data?.total_pages || 1}</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">Per page:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-[#14171c] border border-[#262c36] rounded px-2 py-0.5 text-zinc-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => executeQuery(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded bg-[#14171c] border border-[#262c36] text-zinc-300 hover:bg-[#1f242d] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeQuery(page + 1)}
              disabled={!data || page >= data.total_pages || loading}
              className="p-1.5 rounded bg-[#14171c] border border-[#262c36] text-zinc-300 hover:bg-[#1f242d] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Document JSON Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#14171c] border border-[#262c36] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#262c36] bg-[#0f1115]">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#f59e0b]" />
                <h3 className="text-sm font-semibold text-zinc-100 font-mono">
                  {selectedDoc.transaction_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-amber-200/90 bg-[#0a0c0e]">
              <pre>{JSON.stringify(selectedDoc, null, 2)}</pre>
            </div>
            <div className="px-5 py-3 border-t border-[#262c36] bg-[#0f1115] flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 rounded bg-[#1e242d] hover:bg-[#282f3a] text-xs text-zinc-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
