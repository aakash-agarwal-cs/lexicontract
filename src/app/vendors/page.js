"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [regNum, setRegNum] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchSession();
    fetchVendors();
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch session");
    }
  }

  async function fetchVendors() {
    try {
      const res = await fetch("/api/vendors");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setVendors(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load vendors");
      setLoading(false);
    }
  }

  function handleLogout() {
    // Clear common auth cookie names used in Next.js templates
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
    });
    window.location.href = "/login";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          registration_number: regNum,
          contact_email: email,
          contact_phone: phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create vendor");
      }

      setSuccess("Vendor created successfully!");
      setName("");
      setRegNum("");
      setEmail("");
      setPhone("");
      fetchVendors();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vendors Management</h1>
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                Logged in as: <span className="font-semibold">{user.name}</span> ({user.role})
              </p>
            )}
          </div>
          <div className="space-x-4 flex items-center">
            <Link href="/" className="text-blue-600 hover:underline">Home</Link>
            <Link href="/contracts" className="text-blue-600 hover:underline">Contracts</Link>
            <Link href="/reports" className="text-blue-600 hover:underline">Reports</Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No vendors found.</td></tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.vendor_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{v.vendor_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.registration_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.contact_email || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.contact_phone || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {user?.role === "ADMIN" ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add New Vendor (Admin Only)</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                <input type="text" required value={regNum} onChange={(e) => setRegNum(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Vendor</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm">
            Note: You are logged in as a <strong>Reviewer</strong>. Vendor creation is restricted to Administrators.
          </div>
        )}
      </div>
    </div>
  );
}