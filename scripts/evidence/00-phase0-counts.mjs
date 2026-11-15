import pool from "../../src/lib/db.js";

async function run() {
  const tables = [
    "role",
    "app_user",
    "vendor",
    "standard_clause",
    "contract",
    "clause",
    "approval_step",
    "milestone",
    "review_queue",
    "audit_log"
  ];

  try {
    const counts = {};
    for (const t of tables) {
      const res = await pool.query(`SELECT COUNT(*)::int AS count FROM ${t}`);
      counts[t] = res.rows[0].count;
    }
    console.table(counts);
  } catch (err) {
    console.error("Error fetching counts:", err);
  } finally {
    await pool.end();
  }
}

run();
