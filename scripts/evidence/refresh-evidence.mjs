import fs from "fs";
import path from "path";
import pool from "../../src/lib/db.js";
import { dumpAllTables } from "./collect-dml.mjs";

function formatTable(rows) {
  if (!rows || rows.length === 0) return "No rows returned (0 rows).\n";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length)));
  
  const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
  const sep = widths.map(w => "-".repeat(w)).join("-|-");
  const data = rows.map(r => keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")).join("\n");
  
  return `${header}\n${sep}\n${data}\n\nTotal rows: ${rows.length}\n`;
}

async function refreshAll() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  try {
    // 1. Dump 06x-final-* (all tables)
    console.log("Refreshing 06x-final-*...");
    await dumpAllTables("06x-final");

    // 2. Dump 06y-after-flagging-* for standard_clause, clause, and review_queue
    console.log("Dumping 06y-after-flagging tables...");
    const yQueries = {
      standard_clause: `
        SELECT standard_clause_id, clause_type, clause_text, 
               vector_dims(embedding) AS vector_dims, 
               left(embedding::text, 40) || '...' AS embedding_preview 
        FROM standard_clause ORDER BY standard_clause_id;
      `,
      clause: `
        SELECT clause_id, contract_id, clause_text, clause_type, is_flagged, 
               vector_dims(embedding) AS vector_dims, 
               left(embedding::text, 40) || '...' AS embedding_preview 
        FROM clause ORDER BY clause_id;
      `,
      review_queue: `
        SELECT review_id, clause_id, reviewed_by, flagged_at, resolution_status 
        FROM review_queue ORDER BY review_id;
      `
    };

    for (const [t, sql] of Object.entries(yQueries)) {
      const res = await pool.query(sql);
      const out = `--- TABLE: ${t} (Count: ${res.rows.length}) ---\nSQL: ${sql.trim()}\n\n` + formatTable(res.rows);
      fs.writeFileSync(path.join(screenshotsDir, `06y-after-flagging-${t}.txt`), out);
    }

    // 3. Re-run 07, 08, 09, 10
    console.log("Refreshing 07, 08, 09, 10...");
    
    // 07: GROUP BY aggregate
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

    // 09: Nested query
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

    // 10: HAVING query + view
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

    console.log("All evidence refreshed successfully.");

  } catch (err) {
    console.error("Error refreshing evidence:", err);
  } finally {
    await pool.end();
  }
}

refreshAll();
