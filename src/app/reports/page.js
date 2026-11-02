"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch analytics reports");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading analytics reports...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const { stats, flaggedClauses } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Home</Link>
          <div className="space-x-4">
            <Link href="/contracts" className="text-blue-600 hover:underline">Contracts</Link>
            <Link href="/vendors" className="text-blue-600 hover:underline">Vendors</Link>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Contract Analytics & Risk Audit</h1>

        {/* Portfolio Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Total Contracts</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_contracts}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Active Contracts</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.active_contracts}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Total Vendors</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.total_vendors}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Portfolio Value</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">${Number(stats.total_portfolio_value).toFixed(2)}</div>
          </div>
        </div>

        {/* Risk Audit Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Risk-Flagged Clauses ({flaggedClauses.length})</h2>
          {flaggedClauses.length === 0 ? (
            <p className="text-sm text-gray-500">No high-risk clauses currently flagged across your contracts.</p>
          ) : (
            <div className="space-y-4">
              {flaggedClauses.map((clause) => (
                <div key={clause.clause_id} className="border border-red-200 bg-red-50/50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded">
                      {clause.clause_type}
                    </span>
                    <span className="text-xs text-gray-600">
                      <strong>Vendor:</strong> {clause.vendor_name} | <strong>Contract:</strong> {clause.contract_title}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-2">{clause.clause_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}