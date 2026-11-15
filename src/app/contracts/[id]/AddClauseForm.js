"use client";

import { useState } from "react";

export default function AddClauseForm({ contractId, onClauseAdded, isAdmin }) {
  const [clauseText, setClauseText] = useState("");
  const [clauseType, setClauseType] = useState("TERMINATION");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  if (!isAdmin) {
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/contracts/${contractId}/clauses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_text: clauseText,
          clause_type: clauseType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add clause");
      }

      setMessage({
        flagged: data.flagged,
        similarity: data.best_similarity,
        text: data.message || "Clause added successfully.",
      });

      setClauseText("");
      if (onClauseAdded) {
        onClauseAdded();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-2">Add Clause & Risk Audit (Admin Only)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Clauses are embedded with pgvector and evaluated against standard templates. Clauses with similarity &lt; 0.6 are automatically flagged for review.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded mb-4 text-sm ${
            message.flagged
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-green-100 text-green-800 border border-green-200"
          }`}
        >
          <div className="font-semibold">
            {message.flagged ? "⚠️ Clause Flagged for Risk Audit!" : "✅ Clause Added Successfully"}
          </div>
          <div className="text-xs mt-1">
            {message.similarity !== null && message.similarity !== undefined && (
              <span className="mr-2">Best similarity score: <strong>{Number(message.similarity).toFixed(3)}</strong></span>
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clause Type
          </label>
          <select
            value={clauseType}
            onChange={(e) => setClauseType(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
          >
            <option value="TERMINATION">TERMINATION</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="CONFIDENTIALITY">CONFIDENTIALITY</option>
            <option value="LIABILITY">LIABILITY</option>
            <option value="INDEMNITY">INDEMNITY</option>
            <option value="INTELLECTUAL_PROPERTY">INTELLECTUAL_PROPERTY</option>
            <option value="GENERAL">GENERAL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Clause Text
          </label>
          <textarea
            required
            rows={3}
            value={clauseText}
            onChange={(e) => setClauseText(e.target.value)}
            placeholder="Enter the contractual clause text..."
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Computing Embedding & Adding..." : "Add Clause"}
        </button>
      </form>
    </div>
  );
}
