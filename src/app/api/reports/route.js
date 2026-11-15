import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Contracts per status (GROUP BY)
    const statusQuery = `
      SELECT status, COUNT(*)::INT as count
      FROM contract
      GROUP BY status;
    `;
    const statusRes = await pool.query(statusQuery);

    // 2. Vendors with contract count (HAVING and ORDER BY)
    const vendorsQuery = `
      SELECT v.name, COUNT(c.contract_id)::INT as contract_count
      FROM vendor v
      LEFT JOIN contract c ON v.vendor_id = c.vendor_id
      GROUP BY v.vendor_id, v.name
      HAVING COUNT(c.contract_id) > 0
      ORDER BY contract_count DESC;
    `;
    const vendorsRes = await pool.query(vendorsQuery);

    // 3. Contracts whose milestone total is above the average (Subquery in WHERE)
    const aboveAvgQuery = `
      WITH contract_totals AS (
          SELECT contract_id, SUM(amount) as total_amount
          FROM milestone
          GROUP BY contract_id
      )
      SELECT c.title, ct.total_amount
      FROM contract c
      JOIN contract_totals ct ON c.contract_id = ct.contract_id
      WHERE ct.total_amount > (SELECT AVG(total_amount) FROM contract_totals);
    `;
    const aboveAvgRes = await pool.query(aboveAvgQuery);

    // 4. Flagged contracts (from view v_pending_contract_reviews)
    const flaggedQuery = `SELECT * FROM v_pending_contract_reviews;`;
    const flaggedRes = await pool.query(flaggedQuery);

    // 5. Total Vendors (Count ALL vendors)
    const totalVendorsQuery = `SELECT COUNT(*)::INT as total_vendors FROM vendor;`;
    const totalVendorsRes = await pool.query(totalVendorsQuery);

    // 6. Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(c.contract_id)::INT AS total_contracts,
        COALESCE(SUM(m.total_val), 0) AS total_portfolio_value,
        COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END)::INT AS active_contracts
      FROM contract c
      LEFT JOIN (
        SELECT contract_id, SUM(amount) AS total_val 
        FROM milestone 
        GROUP BY contract_id
      ) m ON c.contract_id = m.contract_id;
    `;
    const statsRes = await pool.query(statsQuery);

    const stats = statsRes.rows[0];
    stats.total_vendors = totalVendorsRes.rows[0].total_vendors;

    return NextResponse.json({
      stats: stats,
      contractsByStatus: statusRes.rows,
      topVendors: vendorsRes.rows,
      highValueContracts: aboveAvgRes.rows,
      flaggedContracts: flaggedRes.rows,
    });
  } catch (err) {
    console.error("API Error in /api/reports:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
