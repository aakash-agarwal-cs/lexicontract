"use client";

import { useState } from "react";

export default function ApprovalStepsSection({
  contractId,
  approvalSteps = [],
  currentUser,
  onStatusChange,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pendingUserStep = approvalSteps.find(
    (step) =>
      step.approver_id === currentUser?.userId && step.status === "PENDING"
  );

  async function handleDecision(decision) {
    if (!confirm(`Are you sure you want to set your decision to ${decision}?`)) {
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/contracts/${contractId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit decision");
      }

      setMessage(
        `Decision submitted: ${decision}. Contract is now ${data.contract_status}.`
      );
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Approval Workflow & Audit ({approvalSteps.length})
          </h2>
          <p className="text-xs text-gray-500">
            Requires dual sign-off (Admin and Reviewer). Updates are logged to the database audit trigger.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
          {message}
        </div>
      )}

      {approvalSteps.length === 0 ? (
        <p className="text-sm text-gray-500">No approval steps configured for this contract.</p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Approver</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Acted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvalSteps.map((step) => (
                <tr key={step.approval_id}>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {step.approver_name || `User #${step.approver_id}`}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold">
                      {step.approver_role || "USER"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        step.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : step.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {step.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">
                    {step.acted_at ? new Date(step.acted_at).toLocaleString() : "Pending action"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action buttons if current logged in user has a pending step */}
      {pendingUserStep && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Your approval is requested on this contract.
            </div>
            <div className="text-xs text-amber-700">
              Signing off will advance the workflow and generate an entry in audit_log.
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleDecision("APPROVED")}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-semibold disabled:opacity-50"
            >
              Approve Contract
            </button>
            <button
              onClick={() => handleDecision("REJECTED")}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-semibold disabled:opacity-50"
            >
              Reject Contract
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
