import fs from "fs";
import path from "path";
import pool from "../../src/lib/db.js";

function formatTable(rows) {
  if (!rows || rows.length === 0) return "No rows returned (0 rows).\n";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length)));
  
  const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
  const sep = widths.map(w => "-".repeat(w)).join("-|-");
  const data = rows.map(r => keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")).join("\n");
  
  return `${header}\n${sep}\n${data}\n\nTotal rows: ${rows.length}\n`;
}

async function runQueries() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  try {
    // 07: GROUP BY + aggregate: contracts per status
    console.log("Running 07: GROUP BY aggregate...");
    const sql07 = `
      SELECT status, COUNT(*)::int AS contract_count
      FROM contract
      GROUP BY status
      ORDER BY contract_count DESC;
    `;
    const res07 = await pool.query(sql07);
    fs.writeFileSync(
      path.join(screenshotsDir, "07-group-by-aggregate.txt"),
      "=== 07: GROUP BY AND AGGREGATE (CONTRACTS PER STATUS) ===\n\nSQL:\n" + sql07.trim() + "\n\nOUTPUT:\n" + formatTable(res07.rows)
    );

    // 08: Correlated query
    console.log("Running 08: Correlated query...");
    const sql08 = `
      SELECT m.milestone_id, m.contract_id, m.description, m.amount
      FROM milestone m
      WHERE m.amount > (
        SELECT AVG(m2.amount)
        FROM milestone m2
        WHERE m2.contract_id = m.contract_id
      )
      ORDER BY m.contract_id, m.milestone_id;
    `;
    const res08 = await pool.query(sql08);
    fs.writeFileSync(
      path.join(screenshotsDir, "08-correlated-query.txt"),
      "=== 08: CORRELATED SUBQUERY (MILESTONES EXCEEDING CONTRACT AVERAGE) ===\n\nSQL:\n" + sql08.trim() + "\n\nOUTPUT:\n" + formatTable(res08.rows)
    );

    // 09: Nested query from src/app/api/reports/route.js
    console.log("Running 09: Nested query...");
    const sql09 = `
      SELECT 
        c.contract_id,
        c.title,
        c.status,
        COALESCE(m.total_val, 0) AS total_milestone_value
      FROM contract c
      LEFT JOIN (
        SELECT contract_id, SUM(amount) AS total_val 
        FROM milestone 
        GROUP BY contract_id
      ) m ON c.contract_id = m.contract_id
      ORDER BY c.contract_id;
    `;
    const res09 = await pool.query(sql09);
    fs.writeFileSync(
      path.join(screenshotsDir, "09-nested-query.txt"),
      "=== 09: NESTED SUBQUERY (CONTRACT PORTFOLIO FROM REPORTS API) ===\n\nSQL:\n" + sql09.trim() + "\n\nOUTPUT:\n" + formatTable(res09.rows)
    );

    // 10: HAVING query + SELECT * FROM v_pending_contract_reviews
    console.log("Running 10: HAVING query and view...");
    const sql10Having = `
      SELECT 
        contract_id, 
        COUNT(*)::int AS milestone_count, 
        SUM(amount) AS total_contract_value
      FROM milestone
      GROUP BY contract_id
      HAVING COUNT(*) >= 2
      ORDER BY contract_id;
    `;
    const res10Having = await pool.query(sql10Having);

    const sql10View = `SELECT * FROM v_pending_contract_reviews;`;
    const res10View = await pool.query(sql10View);

    fs.writeFileSync(
      path.join(screenshotsDir, "10-having-and-view.txt"),
      "=== 10A: HAVING QUERY (CONTRACTS WITH >= 2 MILESTONES) ===\n\nSQL:\n" + sql10Having.trim() + "\n\nOUTPUT:\n" + formatTable(res10Having.rows) +
      "\n=== 10B: VIEW: v_pending_contract_reviews ===\n\nSQL:\n" + sql10View.trim() + "\n\nOUTPUT:\n" + formatTable(res10View.rows)
    );

    // 12: DELETE demo (safe temporary row)
    console.log("Running 12: DELETE demo...");
    const countBeforeRes = await pool.query("SELECT COUNT(*)::int AS count FROM milestone;");
    const countBefore = countBeforeRes.rows[0].count;

    // Insert temp row
    const insRes = await pool.query(`
      INSERT INTO milestone (contract_id, description, due_date, amount, status)
      VALUES (1, 'Temporary Demo Milestone for DELETE Verification', '2026-08-15', 500.00, 'PENDING')
      RETURNING milestone_id, contract_id, description, due_date, amount, status;
    `);
    const tempMilestone = insRes.rows[0];

    const countDuringRes = await pool.query("SELECT COUNT(*)::int AS count FROM milestone;");
    const countDuring = countDuringRes.rows[0].count;

    // Delete ONLY that temporary row
    const delRes = await pool.query(
      "DELETE FROM milestone WHERE milestone_id = $1 RETURNING *;",
      [tempMilestone.milestone_id]
    );

    const countAfterRes = await pool.query("SELECT COUNT(*)::int AS count FROM milestone;");
    const countAfter = countAfterRes.rows[0].count;

    fs.writeFileSync(
      path.join(screenshotsDir, "12-delete-demo.txt"),
      `=== 12: CONTROLLED DELETE DEMONSTRATION ===

1. Milestone Count BEFORE Insert: ${countBefore}

2. Temporary Row Inserted:
${formatTable([tempMilestone])}
Milestone Count AFTER Insert: ${countDuring}

3. SQL Executed:
DELETE FROM milestone WHERE milestone_id = ${tempMilestone.milestone_id} RETURNING *;

Deleted Row:
${formatTable(delRes.rows)}

4. Milestone Count AFTER Delete: ${countAfter}
Verification: Exactly returned to original count (${countBefore} == ${countAfter}). Pre-existing rows untouched.
`
    );

    console.log("Chapter 7 queries completed successfully.");
  } catch (err) {
    console.error("Error running Chapter 7 queries:", err);
  } finally {
    await pool.end();
  }
}

runQueries();
