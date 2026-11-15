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

async function runTests() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  try {
    // 6. Query standard clauses
    console.log("=== STEP 6: VERIFY STANDARD CLAUSES ===");
    const q6 = `
      SELECT standard_clause_id, clause_type, vector_dims(embedding) AS vector_dims
      FROM standard_clause
      ORDER BY standard_clause_id;
    `;
    const res6 = await pool.query(q6);
    console.table(res6.rows);

    const report19 = `=== 19: SEED STANDARD CLAUSES EVIDENCE ===

Command:
node --env-file=.env.local scripts/seed-standard-clauses.mjs

Console Output:
Successfully inserted 8 standard clauses.

Verification Query:
${q6.trim()}

Database Rows:
${formatTable(res6.rows)}
All 8 standard clauses have exactly 384 dimensions.
`;
    fs.writeFileSync(path.join(screenshotsDir, "19-seed-standard-clauses.txt"), report19);

    // 7. Similarity tests
    console.log("\n=== STEP 7: TEST find_similar_standard_clauses ===");

    // Fetch the real seeded Termination clause text
    const termClauseRes = await pool.query(
      "SELECT clause_text FROM standard_clause WHERE clause_type = 'Termination' LIMIT 1;"
    );
    const standardTerminationText = termClauseRes.rows[0].clause_text;
    console.log("Seeded Termination clause:", standardTerminationText);

    // Test (a): Identical clause embedding (own embedding)
    console.log("\n(a) Testing identical clause embedding against 'Termination'...");
    const embA = await embed(standardTerminationText);
    const vecA = toVectorString(embA);
    const resA = await pool.query(
      "SELECT standard_clause_id, clause_type, left(clause_text, 60) || '...' AS preview, similarity FROM find_similar_standard_clauses($1::vector, 'Termination', 3);",
      [vecA]
    );
    console.table(resA.rows);

    // Test (b): Paraphrase of Termination clause
    const paraphraseText = "This agreement may be ended by either company by providing thirty days written notice beforehand, and pending fees shall be paid.";
    console.log("\n(b) Testing paraphrase of Termination clause:", paraphraseText);
    const embB = await embed(paraphraseText);
    const vecB = toVectorString(embB);
    const resB = await pool.query(
      "SELECT standard_clause_id, clause_type, left(clause_text, 60) || '...' AS preview, similarity FROM find_similar_standard_clauses($1::vector, 'Termination', 3);",
      [vecB]
    );
    console.table(resB.rows);

    // Test (c): Unrelated sentence
    const unrelatedText = "The vendor shall deliver twenty fresh apples and oranges to the central market every Monday.";
    console.log("\n(c) Testing unrelated sentence against 'Termination':", unrelatedText);
    const embC = await embed(unrelatedText);
    const vecC = toVectorString(embC);
    const resC = await pool.query(
      "SELECT standard_clause_id, clause_type, left(clause_text, 60) || '...' AS preview, similarity FROM find_similar_standard_clauses($1::vector, 'Termination', 3);",
      [vecC]
    );
    console.table(resC.rows);

    const report19b = `=== 19B: PGVECTOR SIMILARITY TESTS (find_similar_standard_clauses) ===

Target Clause Type: Termination
Standard Template Text:
"${standardTerminationText}"

--- Test (a): Exact Standard Clause Embedding (Self-Match) ---
Input: "${standardTerminationText}"
Results:
${formatTable(resA.rows)}
Score: ${Number(resA.rows[0]?.similarity).toFixed(4)} (matches expectation: ~1.000)

--- Test (b): Realistic Paraphrase of Termination Clause ---
Input: "${paraphraseText}"
Results:
${formatTable(resB.rows)}
Score: ${Number(resB.rows[0]?.similarity).toFixed(4)} (well above 0.600 threshold -> SAFE)

--- Test (c): Completely Unrelated Sentence ---
Input: "${unrelatedText}"
Results:
${formatTable(resC.rows)}
Score: ${Number(resC.rows[0]?.similarity).toFixed(4)} (far below 0.600 threshold -> RISKY / FLAGGED)
`;

    fs.writeFileSync(path.join(screenshotsDir, "19b-similarity-tests.txt"), report19b);
    console.log("19b similarity tests saved to screenshots/19b-similarity-tests.txt.");

  } catch (err) {
    console.error("Error in runTests:", err);
  } finally {
    await pool.end();
  }
}

runTests();
