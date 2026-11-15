"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ReviewQueuePage() {
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    fetchSessionAndQueue();
  }, []);

  async function fetchSessionAndQueue() {
    try {
      const meRes = await fetch("/api/me");
      if (meRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
      }

      await loadQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueue() {
    try {
      const res = await fetch("/api/review-queue");
      if (!res.ok) {
        throw new Error("Failed to load review queue");
      }
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResolve(reviewId, status) {
    setActionMessage("");
    try {
      const res = await fetch(`/api/review-queue/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_status: status }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update review status");
      }

      setActionMessage(`Review marked as ${status}.`);
      await loadQueue();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading review queue...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/contracts" className="text-blue-600 hover:underline">
            &larr; Back to Contracts
          </Link>
          <div className="space-x-4 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">Home</Link>
            <Link href="/vendors" className="text-blue-600 hover:underline">Vendors</Link>
            <Link href="/reports" className="text-blue-600 hover:underline">Reports</Link>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clause Risk Audit Review Queue</h1>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as {user?.name || "User"} ({user?.role})
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
            {actionMessage}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {reviews.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No flagged clauses in the review queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contract & Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clause Text</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Flagged At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((item) => (
                    <tr key={item.review_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/contracts/${item.contract_id}`} className="font-semibold text-indigo-600 hover:underline">
                          {item.contract_title}
                        </Link>
                        <div className="text-xs text-gray-500">{item.vendor_name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold uppercase text-gray-700">
                        {item.clause_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-md">
                        <div className="bg-gray-50 p-2 rounded border border-gray-100 text-xs font-mono">
                          {item.clause_text}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(item.flagged_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.resolution_status === "UNRESOLVED"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.resolution_status === "ACCEPTED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.resolution_status}
                        </span>
                        {item.reviewer_name && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            by {item.reviewer_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                        {item.resolution_status === "UNRESOLVED" ? (
                          <div className="inline-flex space-x-2">
                            <button
                              onClick={() => handleResolve(item.review_id, "ACCEPTED")}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleResolve(item.review_id, "REJECTED")}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
