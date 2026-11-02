"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [vendorId, setVendorId] = useState("");
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("MSA");
  const [status, setStatus] = useState("DRAFT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchContracts();
    fetchVendors();
  }, [statusFilter]);

  async function fetchContracts() {
    try {
      setLoading(true);
      const url = statusFilter === "ALL" ? "/api/contracts" : `/api/contracts?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setContracts(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load contracts");
      setLoading(false);
    }
  }

  async function fetchVendors() {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error("Failed to load vendors for dropdown");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: vendorId,
          title,
          contract_type: contractType,
          status,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create contract");
      }

      setSuccess("Contract created successfully!");
      setTitle("");
      setVendorId("");
      setStartDate("");
      setEndDate("");
      fetchContracts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Contracts Management</h1>
          <div className="space-x-4">
            <Link href="/" className="text-blue-600 hover:underline">Home</Link>
            <Link href="/vendors" className="text-blue-600 hover:underline">Vendors</Link>
            <Link href="/reports" className="text-blue-600 hover:underline">Reports</Link>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

        <div className="bg-white shadow rounded-lg p-4 mb-6 flex items-center space-x-4">
          <label className="font-medium text-sm text-gray-700">Filter by Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded p-1">
            <option value="ALL">ALL</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">No contracts found.</td></tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.contract_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.contract_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.vendor_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.contract_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">{c.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/contracts/${c.contract_id}`} className="text-indigo-600 hover:underline">View Details</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Contract (Admin Only)</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendor</label>
              <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contract Type</label>
              <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                <option value="MSA">MSA</option>
                <option value="SOW">SOW</option>
                <option value="NDA">NDA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
                <option value="DRAFT">DRAFT</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Contract</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}