import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query("SELECT * FROM vendor ORDER BY vendor_id DESC");
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
    const { name, registration_number, contact_email, contact_phone } = body;

    if (!name || !registration_number) {
      return NextResponse.json({ error: "Name and registration number are required" }, { status: 400 });
    }

    const query = `
      INSERT INTO vendor (name, registration_number, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, registration_number, contact_email || null, contact_phone || null];
    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}