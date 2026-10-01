const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Transaction {
  transaction_id: string;
  order_id: string;
  timestamp: string;
  customer: {
    customer_id: string;
    segment: string;
    country: string;
    loyalty_tier: string;
  };
  product: {
    sku: string;
    category: string;
    subcategory?: string;
    unit_price: number;
  };
  metrics: {
    quantity: number;
    gross_amount: number;
    discount_percent: number;
    net_amount: number;
    tax_amount: number;
    shipping_fee: number;
    profit_margin: number;
  };
  fulfillment: {
    warehouse_id: string;
    shipping_carrier: string;
    delivery_days: number;
    status: string;
    delayed: boolean;
  };
  metadata?: Record<string, any>;
}

export interface KPISummary {
  total_transactions: number;
  total_gross_revenue: number;
  total_net_revenue: number;
  average_order_value: number;
  total_units_sold: number;
  average_delivery_days: number;
  delayed_percentage: number;
  top_categories: Array<{
    category: string;
    revenue: number;
    orders: number;
    avg_margin: number;
  }>;
  top_countries: Array<{
    country: string;
    revenue: number;
    orders: number;
  }>;
  status_breakdown: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  revenue_trend: Array<{
    date: string;
    revenue: number;
    orders: number;
    avg_order_value: number;
  }>;
  execution_time_ms: number;
}

export interface PaginatedResult {
  items: Transaction[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
  query_execution_time_ms: number;
}

export interface IngestStats {
  batch_id: string;
  status: string;
  rows_received: number;
  rows_inserted: number;
  rows_rejected: number;
  duration_seconds: number;
  throughput_rows_per_sec: number;
  errors_sample: string[];
}

export interface ExplainBenchmarkResult {
  scenario: string;
  query_description: string;
  query_filter: string;
  execution_stage: string;
  index_used: string;
  total_docs_examined: number;
  n_returned: number;
  efficiency_ratio: number;
  execution_time_ms: number;
  is_optimal_index: boolean;
  sharding_recommendation: {
    is_sharding_needed: boolean;
    recommended_shard_key: string;
    rationale: string;
  };
}

export interface AdvancedStats {
  sample_analyzed: number;
  data_transfer_time_ms: number;
  total_compute_time_ms: number;
  correlation: {
    columns: string[];
    matrix: Record<string, Record<string, number>>;
  };
  outliers: Record<string, {
    q25: number;
    q75: number;
    iqr: number;
    lower_threshold: number;
    upper_threshold: number;
    outlier_count: number;
    outlier_percentage: number;
    extreme_examples: any[];
  }>;
  category_efficiency: any[];
}

export async function fetchKPISummary(params?: { category?: string; start_date?: string; end_date?: string }): Promise<KPISummary> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.start_date) query.append("start_date", params.start_date);
  if (params?.end_date) query.append("end_date", params.end_date);

  const res = await fetch(`${API_BASE_URL}/api/analytics/summary?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load KPI summary: ${res.statusText}`);
  return res.json();
}

export async function fetchPaginatedTransactions(params: Record<string, any>): Promise<PaginatedResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      query.append(key, String(val));
    }
  });

  const res = await fetch(`${API_BASE_URL}/api/query?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to query transactions: ${res.statusText}`);
  return res.json();
}

export async function fetchBenchmarkSuite(): Promise<ExplainBenchmarkResult[]> {
  const res = await fetch(`${API_BASE_URL}/api/benchmark/suite`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch benchmark suite: ${res.statusText}`);
  return res.json();
}

export async function fetchAdvancedStats(sampleLimit: number = 25000): Promise<AdvancedStats> {
  const res = await fetch(`${API_BASE_URL}/api/analytics/advanced/statistical?sample_limit=${sampleLimit}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch advanced statistical analytics: ${res.statusText}`);
  return res.json();
}

export async function uploadDataset(formData: FormData): Promise<IngestStats> {
  const res = await fetch(`${API_BASE_URL}/api/ingest/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || "Upload failed");
  }
  return res.json();
}

export async function triggerSyntheticGenerator(count: number, batchSize: number = 5000): Promise<IngestStats> {
  const res = await fetch(`${API_BASE_URL}/api/ingest/generate?count=${count}&batch_size=${batchSize}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || "Generation failed");
  }
  return res.json();
}

export async function fetchCollectionHealth(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}
