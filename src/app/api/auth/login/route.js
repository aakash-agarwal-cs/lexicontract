import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req) {
  const { email, password } = await req.json();
  const r = await pool.query(
    `SELECT u.user_id, u.full_name, u.password_hash, r.role_name
     FROM app_user u JOIN role r ON u.role_id = r.role_id
     WHERE u.email = $1`,
    [email]
  );
  const user = r.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await createSession(user);
  return Response.json({ ok: true, role: user.role_name });
}