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

  const { stats, contractsByStatus, topVendors, highValueContracts, flaggedContracts } = data;

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
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_contracts || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Active Contracts</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats?.active_contracts || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Total Vendors</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats?.total_vendors || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase">Portfolio Value</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">${Number(stats?.total_portfolio_value || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Grid for Detailed SQL Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Contracts per Status (GROUP BY) */}
          <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Contracts by Status</h2>
            {contractsByStatus && contractsByStatus.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {contractsByStatus.map((item, idx) => (
                  <li key={idx} className="py-2 flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{item.status}</span>
                    <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-0.5 rounded-full">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No contract status data found.</p>
            )}
          </div>

          {/* Vendors with Contract Count (HAVING & ORDER BY) */}
          <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Vendor Contract Breakdown</h2>
            {topVendors && topVendors.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {topVendors.map((v, idx) => (
                  <li key={idx} className="py-2 flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{v.name}</span>
                    <span className="text-gray-600 font-semibold">{v.contract_count} contracts</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No vendor data available.</p>
            )}
          </div>
        </div>

        {/* High-Value Contracts (Milestone Subquery > Average) */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Above-Average Value Contracts</h2>
          {highValueContracts && highValueContracts.length > 0 ? (
            <div className="space-y-3">
              {highValueContracts.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-md border border-indigo-100">
                  <span className="font-semibold text-gray-800 text-sm">{c.title}</span>
                  <span className="font-bold text-indigo-700 text-sm">${Number(c.total_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No contracts currently exceed average milestone total.</p>
          )}
        </div>

        {/* Flagged Contracts View Section */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Risk Reviews / Flagged Contracts ({flaggedContracts?.length || 0})</h2>
          {!flaggedContracts || flaggedContracts.length === 0 ? (
            <p className="text-sm text-gray-500">No pending contract reviews currently flagged.</p>
          ) : (
            <div className="space-y-4">
              {flaggedContracts.map((item, idx) => (
                <div key={idx} className="border border-amber-200 bg-amber-50/50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {item.title || item.contract_title || "Pending Review"}
                    </span>
                    <span className="text-xs text-gray-600">
                      Status: <strong>{item.status || "REVIEW"}</strong>
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-2">{item.description || item.reason || "Requires review attention."}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
