#!/usr/bin/env python3
"""
CLI Query Benchmark & Explain Plan Inspector
Runs MongoDB .explain("executionStats") on production query patterns.
"""
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.benchmark import benchmark_suite
from app.database import get_sync_collection

def run_benchmarks():
    col = get_sync_collection()
    doc_count = col.estimated_document_count()
    print(f"===========================================================")
    print(f" MongoDB Explain Plan & Performance Benchmark CLI")
    print(f" Target Collection: '{col.name}' (Estimated Docs: {doc_count:,})")
    print(f"===========================================================\n")

    results = benchmark_suite()
    for res in results:
        print(f"Scenario: {res['scenario']}")
        print(f"Query:    {res['query_description']}")
        print(f"Stage:    {res['execution_stage']} (Index Used: {res['index_used']})")
        print(f"Optimal:  {'YES (IXSCAN)' if res['is_optimal_index'] else 'NO (COLLSCAN / Table Scan)'}")
        print(f"Returned: {res['n_returned']} docs | Examined: {res['total_docs_examined']} docs")
        print(f"Ratio:    {res['efficiency_ratio']} docs examined per returned doc")
        print(f"Latency:  {res['execution_time_ms']} ms")
        print("-" * 59)

    print("\n[Sharding Architecture Recommendation]")
    print(f"Suggested Shard Key: {results[0]['sharding_recommendation']['recommended_shard_key']}")
    print(f"Rationale: {results[0]['sharding_recommendation']['rationale']}")

if __name__ == "__main__":
    run_benchmarks()
