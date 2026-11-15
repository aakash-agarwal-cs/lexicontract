import fs from "fs";
import path from "path";
import pool from "../../src/lib/db.js";

function formatTable(rows) {
  if (!rows || rows.length === 0) return "No rows returned.\n";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length)));
  
  const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
  const sep = widths.map(w => "-".repeat(w)).join("-|-");
  const data = rows.map(r => keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")).join("\n");
  
  return `${header}\n${sep}\n${data}\n\nTotal rows: ${rows.length}\n`;
}

async function collectChapter8() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");

  try {
    // 13: Function and Trigger definitions
    console.log("Collecting 13: Function and Trigger definitions...");
    
    // Functions
    const funcQueries = [
      { name: "log_contract_status_change", query: "SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'log_contract_status_change';" },
      { name: "get_contract_summary", query: "SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'get_contract_summary';" },
      { name: "find_similar_standard_clauses", query: "SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'find_similar_standard_clauses';" },
      { name: "check_milestone_date_range", query: "SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'check_milestone_date_range';" }
    ];

    let defsOutput = "=== 13: DATABASE FUNCTIONS AND TRIGGERS DEFINITIONS ===\n\n";

    for (const f of funcQueries) {
      const res = await pool.query(f.query);
      defsOutput += `--- FUNCTION: ${f.name} ---\n${res.rows[0]?.def || "Not found"}\n\n`;
    }

    // Triggers
    const trgRes = await pool.query(`
      SELECT 
        event_object_table AS table_name,
        trigger_name,
        action_timing,
        event_manipulation AS event,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    // Real trigger DDL via pg_trigger
    const trgDefRes = await pool.query(`
      SELECT 
        tgname AS trigger_name,
        relname AS table_name,
        pg_get_triggerdef(t.oid, true) AS trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT tgisinternal
      ORDER BY relname, tgname;
    `);

    defsOutput += "--- TRIGGER DEFINITIONS ---\n\n" + formatTable(trgDefRes.rows);
    fs.writeFileSync(path.join(screenshotsDir, "13-function-and-trigger-defs.txt"), defsOutput);

    // 14: SELECT * FROM get_contract_summary(1);
    console.log("Collecting 14: get_contract_summary(1)...");
    const sql14 = "SELECT * FROM get_contract_summary(1);";
    const res14 = await pool.query(sql14);
    fs.writeFileSync(
      path.join(screenshotsDir, "14-contract-summary-function.txt"),
      "=== 14: STORED FUNCTION EXECUTION: get_contract_summary(1) ===\n\nSQL:\n" + sql14 + "\n\nOUTPUT:\n" + formatTable(res14.rows)
    );

    // 16: test-rollback.mjs
    console.log("Collecting 16: test-rollback...");
    const client = await pool.connect();
    let rollbackReport = "=== 16: ATOMIC TRANSACTION ROLLBACK TEST ===\n\n";
    try {
      await client.query("BEGIN");
      rollbackReport += "Step 1: BEGIN executed.\n";
      
      const insRes = await client.query(
        "INSERT INTO clause (contract_id, clause_text, clause_type, is_flagged) VALUES (1, 'Forced Error Rollback Test Clause', 'TEST', false) RETURNING clause_id;"
      );
      const insertedId = insRes.rows[0].clause_id;
      rollbackReport += `Step 2: Temporary clause inserted with clause_id: ${insertedId}, clause_type: 'TEST'.\n`;

      // Simulating error
      rollbackReport += "Step 3: Simulating application or constraint error before commit...\n";
      throw new Error("Simulated failure to verify atomic ROLLBACK!");
    } catch (err) {
      rollbackReport += `Step 4: Error caught: "${err.message}". Executing ROLLBACK...\n`;
      await client.query("ROLLBACK");
      rollbackReport += "Step 5: ROLLBACK executed.\n";
    } finally {
      client.release();
    }

    const checkTestRes = await pool.query("SELECT COUNT(*)::int AS count FROM clause WHERE clause_type = 'TEST';");
    const countTest = checkTestRes.rows[0].count;
    rollbackReport += `\nVerification Query:\nSELECT COUNT(*) FROM clause WHERE clause_type = 'TEST';\nCount: ${countTest}\n`;
    if (countTest === 0) {
      rollbackReport += "\n>>> RESULT: SUCCESS! Rollback confirmed, 0 uncommitted rows exist.\n";
    } else {
      rollbackReport += "\n>>> RESULT: FAILED! Row leaked.\n";
    }
    fs.writeFileSync(path.join(screenshotsDir, "16-test-rollback.txt"), rollbackReport);

    // 18: Milestone date trigger rejection test
    console.log("Collecting 18: Milestone date trigger rejection...");
    let triggerReport = "=== 18: MILESTONE DATE TRIGGER REJECTION TEST ===\n\n";
    triggerReport += "Testing trigger trg_check_milestone_date with due_date '2029-12-31' outside Contract 1 validity period (2026-01-01 to 2027-01-01).\n\n";
    
    let caughtError = null;
    try {
      await pool.query(`
        INSERT INTO milestone (contract_id, description, due_date, amount, status)
        VALUES (1, 'Invalid Future Milestone Beyond Contract End', '2029-12-31', 9999.00, 'PENDING');
      `);
    } catch (err) {
      caughtError = err;
      triggerReport += `Expected Rejection Caught:\nCode: ${err.code}\nMessage: ${err.message}\nDetail: ${err.detail || "None"}\nWhere: ${err.where || "None"}\n\n`;
    }

    const verifyInsert = await pool.query("SELECT * FROM milestone WHERE description = 'Invalid Future Milestone Beyond Contract End';");
    triggerReport += `Verification Query:\nSELECT COUNT(*) FROM milestone WHERE description = 'Invalid Future Milestone Beyond Contract End';\nRows found: ${verifyInsert.rows.length}\n`;
    if (caughtError && verifyInsert.rows.length === 0) {
      triggerReport += "\n>>> RESULT: SUCCESS! Trigger actively rejected bad due_date and prevented row insertion.\n";
    }
    fs.writeFileSync(path.join(screenshotsDir, "18-milestone-date-trigger-rejection.txt"), triggerReport);

    console.log("Chapter 8 evidence collected successfully.");
  } catch (err) {
    console.error("Error in collectChapter8:", err);
  } finally {
    await pool.end();
  }
}

collectChapter8();
