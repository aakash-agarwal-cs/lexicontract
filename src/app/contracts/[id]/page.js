"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ContractDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchContractDetail();
    }
  }, [id]);

  async function fetchContractDetail() {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch contract details");
      }
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading contract details...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-center">Contract not found.</div>;

  const { contract, clauses, milestones } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/contracts" className="text-blue-600 hover:underline">&larr; Back to Contracts</Link>
          <div className="space-x-4">
            <Link href="/" className="text-blue-600 hover:underline">Home</Link>
            <Link href="/vendors" className="text-blue-600 hover:underline">Vendors</Link>
            <Link href="/reports" className="text-blue-600 hover:underline">Reports</Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{contract.title}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div><strong className="text-gray-900">Vendor:</strong> {contract.vendor_name}</div>
            <div><strong className="text-gray-900">Type:</strong> {contract.contract_type}</div>
            <div><strong className="text-gray-900">Status:</strong> <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">{contract.status}</span></div>
            <div><strong className="text-gray-900">Registration No:</strong> {contract.registration_number}</div>
            <div><strong className="text-gray-900">Start Date:</strong> {contract.start_date?.split("T")[0]}</div>
            <div><strong className="text-gray-900">End Date:</strong> {contract.end_date?.split("T")[0]}</div>
            <div><strong className="text-gray-900">Contact Email:</strong> {contract.contact_email || "N/A"}</div>
            <div><strong className="text-gray-900">Contact Phone:</strong> {contract.contact_phone || "N/A"}</div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Clauses ({clauses.length})</h2>
          {clauses.length === 0 ? (
            <p className="text-sm text-gray-500">No clauses found for this contract.</p>
          ) : (
            <div className="space-y-4">
              {clauses.map((clause) => (
                <div key={clause.clause_id} className="border border-gray-200 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold uppercase text-indigo-600">{clause.clause_type}</span>
                    {clause.is_flagged && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded font-semibold">Flagged</span>}
                  </div>
                  <p className="text-sm text-gray-800">{clause.clause_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Milestones ({milestones.length})</h2>
          {milestones.length === 0 ? (
            <p className="text-sm text-gray-500">No milestones found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {milestones.map((m) => (
                    <tr key={m.milestone_id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{m.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{m.due_date?.split("T")[0]}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">${Number(m.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-semibold">{m.status}</span>
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