import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await pool.query(
    "DELETE FROM milestone WHERE milestone_id = $1 RETURNING milestone_id",
    [id]
  );
  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}