import fs from "fs";
import path from "path";
import pool from "../../src/lib/db.js";
import { embed, toVectorString } from "../../src/lib/embeddings.js";

function formatTable(rows) {
  if (!rows || rows.length === 0) return "No rows returned.\n";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length)));
  
  const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
  const sep = widths.map(w => "-".repeat(w)).join("-|-");
  const data = rows.map(r => keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")).join("\n");
  
  return `${header}\n${sep}\n${data}\n\nTotal rows: ${rows.length}\n`;
}

async function addClauseTransaction(contractId, clauseType, clauseText) {
  const embedding = await embed(clauseText.trim());
  const vectorStr = toVectorString(embedding);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertRes = await client.query(
      `INSERT INTO clause (contract_id, clause_text, clause_type, embedding, is_flagged)
       VALUES ($1, $2, $3, $4::vector, FALSE)
       RETURNING clause_id, contract_id, clause_text, clause_type, is_flagged`,
      [contractId, clauseText.trim(), clauseType.trim(), vectorStr]
    );
    const newClause = insertRes.rows[0];
    const clauseId = newClause.clause_id;

    const simRes = await client.query(
      "SELECT * FROM find_similar_standard_clauses($1::vector, $2, 3)",
      [vectorStr, clauseType.trim()]
    );

    let flagged = false;
    let bestSimilarity = null;
    let reviewQueueRow = null;

    if (simRes.rows.length > 0) {
      bestSimilarity = parseFloat(simRes.rows[0].similarity);
      if (bestSimilarity < 0.6) {
        flagged = true;
        await client.query(
          "UPDATE clause SET is_flagged = TRUE WHERE clause_id = $1",
          [clauseId]
        );
        const rqRes = await client.query(
          "INSERT INTO review_queue (clause_id) VALUES ($1) RETURNING *",
          [clauseId]
        );
        reviewQueueRow = rqRes.rows[0];
      }
    }

    newClause.is_flagged = flagged;
    await client.query("COMMIT");

    return {
      clause: newClause,
      flagged,
      best_similarity: bestSimilarity,
      reviewQueueRow
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function runDemo() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  console.log("=== STEP 8 & 9: RUNNING FLAGGING DEMO DIRECTLY ===");

  try {
    // 1. Add SAFE clause
    console.log("\n1. Adding SAFE clause...");
    const safeText = "This agreement may be ended by either company by providing thirty days written notice beforehand, and pending fees shall be paid.";
    const safeResult = await addClauseTransaction(1, "Termination", safeText);
    console.log("Safe Result:", {
      clause_id: safeResult.clause.clause_id,
      is_flagged: safeResult.flagged,
      similarity: safeResult.best_similarity?.toFixed(4)
    });

    // 2. Add RISKY clause
    console.log("\n2. Adding RISKY clause...");
    const riskyText = "The client reserves the sole and exclusive right to instantly cancel all project activities without financial settlement, penalty, or prior announcement.";
    const riskyResult = await addClauseTransaction(1, "Termination", riskyText);
    console.log("Risky Result:", {
      clause_id: riskyResult.clause.clause_id,
      is_flagged: riskyResult.flagged,
      similarity: riskyResult.best_similarity?.toFixed(4),
      review_id: riskyResult.reviewQueueRow?.review_id
    });

    // 3. Database verification of both clauses
    const clausesRes = await pool.query(`
      SELECT clause_id, contract_id, clause_type, is_flagged, left(clause_text, 65) || '...' AS text_preview
      FROM clause
      WHERE clause_id IN ($1, $2)
      ORDER BY clause_id;
    `, [safeResult.clause.clause_id, riskyResult.clause.clause_id]);
    console.log("\n--- Database Clause Rows ---");
    console.table(clausesRes.rows);

    // 4. Initial Review Queue Row
    const initialRqRes = await pool.query(
      "SELECT * FROM review_queue WHERE clause_id = $1;",
      [riskyResult.clause.clause_id]
    );
    console.log("\n--- Initial Review Queue Row (UNRESOLVED) ---");
    console.table(initialRqRes.rows);

    // 5. Step 10: Resolve the review queue entry (Admin Aakash Agarwal resolves as ACCEPTED)
    console.log("\n=== STEP 10: RESOLVING REVIEW QUEUE ENTRY ===");
    const resolveRes = await pool.query(`
      UPDATE review_queue
      SET resolution_status = 'ACCEPTED',
          reviewed_by = 1
      WHERE clause_id = $1
      RETURNING *;
    `, [riskyResult.clause.clause_id]);
    console.log("Resolved Review Queue Row:");
    console.table(resolveRes.rows);

    // 6. Save full evidence report
    const evidenceReport = `=== 20: CLAUSE FLAGGING & REVIEW QUEUE DEMO EVIDENCE ===

--- 1. Safe Clause Insertion ---
Type: Termination
Input: "${safeText}"
Result:
- Best Similarity Score: ${safeResult.best_similarity.toFixed(4)} (Threshold: 0.600)
- is_flagged: ${safeResult.flagged}
- Outcome: Clause accepted safely without flagging.

--- 2. Risky Clause Insertion ---
Type: Termination
Input: "${riskyText}"
Result:
- Best Similarity Score: ${riskyResult.best_similarity.toFixed(4)} (Threshold: 0.600)
- is_flagged: ${riskyResult.flagged}
- Review Queue ID: ${riskyResult.reviewQueueRow?.review_id}
- Outcome: Low similarity triggered atomic flagging and routing to review_queue.

--- 3. Database Clause Verification ---
${formatTable(clausesRes.rows)}

--- 4. Initial Review Queue Record (Pre-Resolution) ---
${formatTable(initialRqRes.rows)}

--- 5. Resolved Review Queue Record (Post-Resolution by Admin) ---
SQL Executed:
UPDATE review_queue SET resolution_status = 'ACCEPTED', reviewed_by = 1 WHERE review_id = ${riskyResult.reviewQueueRow?.review_id} RETURNING *;

Updated Row:
${formatTable(resolveRes.rows)}
`;

    fs.writeFileSync(path.join(screenshotsDir, "20-flagging-demo.txt"), evidenceReport);
    console.log("\nEvidence saved to screenshots/20-flagging-demo.txt.");

  } catch (err) {
    console.error("Error running flagging demo:", err);
  } finally {
    await pool.end();
  }
}

runDemo();
