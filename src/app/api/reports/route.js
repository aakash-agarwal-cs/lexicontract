import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Overall Company & Contract Statistics
    const statsQuery = `
      SELECT 
        COUNT(c.contract_id)::INT AS total_contracts,
        COALESCE(SUM(m.total_val), 0) AS total_portfolio_value,
        COUNT(DISTINCT c.vendor_id)::INT AS total_vendors,
        COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END)::INT AS active_contracts
      FROM contract c
      LEFT JOIN (
        SELECT contract_id, SUM(amount) AS total_val 
        FROM milestone 
        GROUP BY contract_id
      ) m ON c.contract_id = m.contract_id;
    `;
    const statsRes = await pool.query(statsQuery);

    // 2. Risk-Flagged Clauses across all contracts
    const flaggedQuery = `
      SELECT cl.clause_id, cl.clause_type, cl.clause_text, c.title AS contract_title, v.name AS vendor_name
      FROM clause cl
      JOIN contract c ON cl.contract_id = c.contract_id
      JOIN vendor v ON c.vendor_id = v.vendor_id
      WHERE cl.is_flagged = TRUE;
    `;
    const flaggedRes = await pool.query(flaggedQuery);

    return NextResponse.json({
      stats: statsRes.rows[0] || { total_contracts: 0, total_portfolio_value: 0, total_vendors: 0, active_contracts: 0 },
      flaggedClauses: flaggedRes.rows,
    });
  } catch (err) {
    console.error("API Error in /api/reports:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}