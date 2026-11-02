import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = `
      SELECT c.*, v.name AS vendor_name 
      FROM contract c
      JOIN vendor v ON c.vendor_id = v.vendor_id
    `;
    let values = [];

    if (status && status !== "ALL") {
      query += ` WHERE c.status = $1`;
      values.push(status);
    }

    query += ` ORDER BY c.contract_id DESC`;

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { vendor_id, title, contract_type, status, start_date, end_date } = body;

    if (!vendor_id || !title || !contract_type || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const query = `
      INSERT INTO contract (vendor_id, created_by, title, contract_type, status, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      vendor_id,
      session.userId,
      title,
      contract_type,
      status || "DRAFT",
      start_date,
      end_date
    ];

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}