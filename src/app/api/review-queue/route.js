import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const query = `
      SELECT 
        rq.review_id,
        rq.clause_id,
        rq.reviewed_by,
        rq.flagged_at,
        rq.resolution_status,
        c.clause_text,
        c.clause_type,
        c.is_flagged,
        ct.contract_id,
        ct.title AS contract_title,
        ct.status AS contract_status,
        v.vendor_id,
        v.name AS vendor_name,
        u.full_name AS reviewer_name
      FROM review_queue rq
      JOIN clause c ON rq.clause_id = c.clause_id
      JOIN contract ct ON c.contract_id = ct.contract_id
      JOIN vendor v ON ct.vendor_id = v.vendor_id
      LEFT JOIN app_user u ON rq.reviewed_by = u.user_id
      ORDER BY 
        CASE WHEN rq.resolution_status = 'UNRESOLVED' THEN 0 ELSE 1 END,
        rq.flagged_at DESC;
    `;

    const res = await pool.query(query);
    return NextResponse.json({ reviews: res.rows });
  } catch (err) {
    console.error("Error in GET /api/review-queue:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
