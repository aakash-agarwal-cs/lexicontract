import pool from "@/lib/db";

export async function GET() {
  const r = await pool.query("select now()");
  return Response.json({ ok: true, time: r.rows[0].now });
}