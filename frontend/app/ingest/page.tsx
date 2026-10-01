"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle2, AlertOctagon, Zap, Layers, RefreshCw, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { uploadDataset, triggerSyntheticGenerator, IngestStats } from "@/lib/api";

export default function IngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [batchSize, setBatchSize] = useState<number>(10000);
  const [useUpsert, setUseUpsert] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStats, setUploadStats] = useState<IngestStats | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Synthetic Generator state
  const [genCount, setGenCount] = useState<number>(10000);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genStats, setGenStats] = useState<IngestStats | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadStats(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("batch_size", String(batchSize));
    formData.append("use_upsert", String(useUpsert));

    try {
      const stats = await uploadDataset(formData);
      setUploadStats(stats);
      setFile(null);
    } catch (err: any) {
      setUploadError(err.message || "File ingestion failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunGenerator = async () => {
    setIsGenerating(true);
    setGenError(null);
    setGenStats(null);

    try {
      const stats = await triggerSyntheticGenerator(genCount, batchSize);
      setGenStats(stats);
    } catch (err: any) {
      setGenError(err.message || "Data generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262c36]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            Data Ingestion & Bulk Stream Engine
            <span className="text-xs px-2 py-0.5 rounded bg-[#241e12] border border-[#d97706]/40 text-[#f59e0b] font-mono font-normal">
              PyMongo bulk_write
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Chunked streaming ingestion (5k–10k docs/batch) with Pydantic schema validation & upsert deduplication
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form Section */}
        <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#f59e0b]" />
              Stream File Ingestion
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">CSV &bull; JSON &bull; Parquet</span>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-[#262c36] hover:border-[#d97706]/60 rounded-lg p-6 text-center transition-all bg-[#0d0f12]">
              <input
                type="file"
                id="file-upload"
                accept=".csv,.json,.jsonl,.parquet,.pq"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                <FileText className="w-8 h-8 mx-auto text-zinc-500" />
                <div className="text-xs text-zinc-300">
                  {file ? (
                    <span className="font-semibold text-[#f59e0b]">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  ) : (
                    <span>Click or drag and drop dataset file here</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">Supports files up to 500MB with client streaming</p>
              </label>
            </div>

            {/* Ingestion Parameters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Batch Chunk Size</label>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0d0f12] border border-[#262c36] rounded text-zinc-200"
                >
                  <option value={2500}>2,500 docs/batch</option>
                  <option value={5000}>5,000 docs/batch</option>
                  <option value={10000}>10,000 docs/batch</option>
                  <option value={25000}>25,000 docs/batch</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Deduplication Strategy</label>
                <select
                  value={useUpsert ? "true" : "false"}
                  onChange={(e) => setUseUpsert(e.target.value === "true")}
                  className="w-full px-3 py-2 bg-[#0d0f12] border border-[#262c36] rounded text-zinc-200"
                >
                  <option value="true">Upsert (UpdateOne upsert=True)</option>
                  <option value="false">Append (insert_many unordered)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-2.5 rounded-md bg-[#241e12] hover:bg-[#2d2516] border border-[#d97706]/60 text-[#f59e0b] text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#f59e0b]" />
                  Streaming & Validating Batches...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Execute Stream Ingestion
                </>
              )}
            </button>
          </form>

          {uploadError && (
            <div className="p-3 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {uploadError}
            </div>
          )}

          {uploadStats && (
            <div className="p-4 rounded-lg bg-[#0d0f12] border border-[#10b981]/40 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[#10b981] font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Batch {uploadStats.batch_id} Completed
                </span>
                <span>{uploadStats.duration_seconds}s</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px] pt-1">
                <div>Inserted: <span className="text-zinc-200">{uploadStats.rows_inserted.toLocaleString()}</span></div>
                <div>Rejected: <span className="text-zinc-200">{uploadStats.rows_rejected.toLocaleString()}</span></div>
                <div className="col-span-2 text-[#f59e0b]">
                  Throughput: <span className="font-bold">{uploadStats.throughput_rows_per_sec.toLocaleString()}</span> rows/sec
                </div>
              </div>
            </div>
          )}
        </div>

        {/* High-Volume Synthetic Generator Section */}
        <div className="p-5 rounded-lg bg-[#14171c] border border-[#262c36] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#10b981]" />
              Scale Simulator (Synthetic Data Generator)
            </h2>
            <span className="text-[11px] font-mono text-[#10b981]">Millions Scale Ready</span>
          </div>
          <p className="text-xs text-zinc-400">
            Generate high-throughput realistic enterprise transaction streams directly to stress test MongoDB indexing and aggregations.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-zinc-400 mb-1 font-mono text-[11px]">Generate Volume</label>
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 50000, 100000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGenCount(num)}
                    className={`py-2 text-xs font-mono rounded border transition-all ${
                      genCount === num
                        ? "bg-[#1c221c] border-[#10b981] text-[#10b981] font-bold"
                        : "bg-[#0d0f12] border-[#262c36] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {num.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded bg-[#0d0f12] border border-[#262c36] text-xs space-y-1.5 text-zinc-400">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" /> Pydantic Schema Guarantee
              </div>
              <p className="text-[11px]">
                Generates realistic transactions with category hierarchies, customer segments, logistic SLAs, and profit margins.
              </p>
            </div>

            <button
              onClick={handleRunGenerator}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-md bg-[#162217] hover:bg-[#1d2d1e] border border-[#10b981]/50 text-[#10b981] text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#10b981]" />
                  Generating & Bulk Inserting {genCount.toLocaleString()} Records...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate {genCount.toLocaleString()} Documents
                </>
              )}
            </button>

            {genError && (
              <div className="p-3 rounded bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                {genError}
              </div>
            )}

            {genStats && (
              <div className="p-4 rounded-lg bg-[#0d0f12] border border-[#10b981]/40 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-[#10b981] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Batch {genStats.batch_id} Created
                  </span>
                  <span>{genStats.duration_seconds}s</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px] pt-1">
                  <div>Inserted: <span className="text-zinc-200">{genStats.rows_inserted.toLocaleString()}</span></div>
                  <div>Rejected: <span className="text-zinc-200">{genStats.rows_rejected.toLocaleString()}</span></div>
                  <div className="col-span-2 text-[#10b981]">
                    Throughput: <span className="font-bold">{genStats.throughput_rows_per_sec.toLocaleString()}</span> docs/sec
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
