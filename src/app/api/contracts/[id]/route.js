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

    // 1. Fetch Contract and Vendor details (fixed v.name AS vendor_name)
    const contractQuery = `
      SELECT c.*, v.name AS vendor_name, v.registration_number, v.contact_email, v.contact_phone
      FROM contract c
      JOIN vendor v ON c.vendor_id = v.vendor_id
      WHERE c.contract_id = $1;
    `;
    const contractRes = await pool.query(contractQuery, [id]);

    if (contractRes.rows.length === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // 2. Fetch Clauses
    const clausesQuery = `SELECT * FROM clause WHERE contract_id = $1;`;
    const clausesRes = await pool.query(clausesQuery, [id]);

    // 3. Fetch Milestones
    const milestonesQuery = `SELECT * FROM milestone WHERE contract_id = $1 ORDER BY due_date ASC;`;
    const milestonesRes = await pool.query(milestonesQuery, [id]);

    // 4. Fetch Contract Summary using the Stored Function
    const summaryQuery = `SELECT * FROM get_contract_summary($1);`;
    const summaryRes = await pool.query(summaryQuery, [id]);

    return NextResponse.json({
      contract: contractRes.rows[0],
      clauses: clausesRes.rows.length > 0 ? clausesRes.rows : [],
      milestones: milestonesRes.rows,
      summary: summaryRes.rows[0] || { total_milestones: 0, completed_milestones: 0, total_value: 0, completed_value: 0 },
    });
  } catch (err) {
    console.error("API Error in /api/contracts/[id]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}