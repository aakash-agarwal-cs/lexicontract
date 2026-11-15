import pool from "../src/lib/db.js";

async function testRollback() {
  const client = await pool.connect();
  console.log("=== 16: STANDALONE TRANSACTION ROLLBACK TEST ===");
  try {
    await client.query("BEGIN");
    console.log("1. Executed BEGIN.");

    const res = await client.query(
      "INSERT INTO clause (contract_id, clause_text, clause_type, is_flagged) VALUES (1, 'Forced Error Rollback Clause', 'TEST', false) RETURNING clause_id;"
    );
    console.log(`2. Inserted temporary clause (id: ${res.rows[0].clause_id}) with clause_type = 'TEST'.`);

    console.log("3. Forcing deliberate failure before commit...");
    throw new Error("Simulated failure to prove ROLLBACK!");
  } catch (err) {
    console.log("4. Caught error:", err.message);
    await client.query("ROLLBACK");
    console.log("5. Executed ROLLBACK.");
  } finally {
    client.release();
  }

  const check = await pool.query("SELECT COUNT(*)::int AS count FROM clause WHERE clause_type = 'TEST';");
  console.log(`6. Query: SELECT COUNT(*) FROM clause WHERE clause_type = 'TEST' -> Result: ${check.rows[0].count}`);
  if (check.rows[0].count === 0) {
    console.log(">>> SUCCESS: 0 uncommitted rows found. Rollback proved!");
  } else {
    console.error(">>> FAILURE: Row remained!");
  }
  await pool.end();
}

testRollback();
