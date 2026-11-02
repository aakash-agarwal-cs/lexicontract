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

    const contractQuery = `
      SELECT c.*, v.name AS vendor_name, v.contact_email, v.contact_phone, v.registration_number
      FROM contract c
      JOIN vendor v ON c.vendor_id = v.vendor_id
      WHERE c.contract_id = $1;
    `;
    const contractResult = await pool.query(contractQuery, [id]);

    if (contractResult.rows.length === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const clausesQuery = `SELECT * FROM clause WHERE contract_id = $1 ORDER BY clause_id;`;
    const clausesResult = await pool.query(clausesQuery, [id]);

    const milestonesQuery = `SELECT * FROM milestone WHERE contract_id = $1 ORDER BY due_date;`;
    const milestonesResult = await pool.query(milestonesQuery, [id]);

    return NextResponse.json({
      contract: contractResult.rows[0],
      clauses: clausesResult.rows,
      milestones: milestonesResult.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}