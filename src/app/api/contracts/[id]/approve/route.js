import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const query = `
      SELECT a.approval_id, a.contract_id, a.approver_id, a.status, a.acted_at,
             u.full_name AS approver_name, u.email AS approver_email, r.role_name AS approver_role
      FROM approval_step a
      JOIN app_user u ON a.approver_id = u.user_id
      JOIN role r ON u.role_id = r.role_id
      WHERE a.contract_id = $1
      ORDER BY a.approval_id ASC;
    `;
    const res = await pool.query(query, [contractId]);
    return NextResponse.json({ approval_steps: res.rows });
  } catch (err) {
    console.error("Error in GET /api/contracts/[id]/approve:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const body = await request.json();
    const { decision } = body;

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json(
        { error: "decision must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Set app.user_id inside transaction so log_contract_status_change() audit trigger records who acted
      await client.query(
        "SELECT set_config('app.user_id', $1, true)",
        [String(session.userId)]
      );

      // 2. UPDATE the caller's own PENDING approval_step row
      const updateStepRes = await client.query(
        `UPDATE approval_step
         SET status = $1, acted_at = CURRENT_TIMESTAMP
         WHERE contract_id = $2 AND approver_id = $3 AND status = 'PENDING'
         RETURNING *`,
        [decision, contractId, session.userId]
      );

      if (updateStepRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "No pending approval step found for this user on this contract" },
          { status: 403 }
        );
      }

      const updatedStep = updateStepRes.rows[0];

      // 3. Fetch contract to determine status transition
      const contractRes = await client.query(
        "SELECT status FROM contract WHERE contract_id = $1",
        [contractId]
      );
      if (contractRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }

      const currentStatus = contractRes.rows[0].status;
      let newStatus = currentStatus;

      if (decision === "REJECTED") {
        newStatus = "DRAFT";
      } else if (decision === "APPROVED") {
        // Check if there are any remaining PENDING steps
        const pendingRes = await client.query(
          "SELECT COUNT(*) FROM approval_step WHERE contract_id = $1 AND status = 'PENDING'",
          [contractId]
        );
        const remainingPending = parseInt(pendingRes.rows[0].count, 10);
        if (remainingPending === 0) {
          newStatus = "ACTIVE";
        }
      }

      // Update contract status if changed (which fires trg_contract_status_audit)
      if (newStatus !== currentStatus) {
        await client.query(
          "UPDATE contract SET status = $1 WHERE contract_id = $2",
          [newStatus, contractId]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        decision,
        approval_step: updatedStep,
        contract_status: newStatus,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error in POST /api/contracts/[id]/approve:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
