import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(req) {
  const { full_name, email, password } = await req.json();
  if (!full_name || !email || !password || password.length < 6) {
    return Response.json(
      { error: "Name, email and a password of 6+ characters are required" },
      { status: 400 }
    );
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      `INSERT INTO app_user (full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, (SELECT role_id FROM role WHERE role_name = 'REVIEWER'))`,
      [full_name, email, hash]
    );
    return Response.json({ ok: true });
  } catch (e) {
    if (e.code === "23505")
      return Response.json({ error: "Email already registered" }, { status: 409 });
    throw e;
  }
}