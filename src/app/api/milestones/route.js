import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

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
    const { contract_id, description, due_date, amount, status } = body;

    if (!contract_id || !description || !due_date || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const query = `
      INSERT INTO milestone (contract_id, description, due_date, amount, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [contract_id, description, due_date, amount, status || "PENDING"];
    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}