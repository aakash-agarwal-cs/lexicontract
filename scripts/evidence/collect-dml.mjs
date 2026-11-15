import fs from "fs";
import path from "path";
import pool from "../../src/lib/db.js";

function formatTable(rows) {
  if (!rows || rows.length === 0) return "No rows found.\n";
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? "").length)));
  
  const header = keys.map((k, i) => k.padEnd(widths[i])).join(" | ");
  const sep = widths.map(w => "-".repeat(w)).join("-|-");
  const data = rows.map(r => keys.map((k, i) => String(r[k] ?? "").padEnd(widths[i])).join(" | ")).join("\n");
  
  return `${header}\n${sep}\n${data}\n\nTotal rows: ${rows.length}\n`;
}

export async function dumpAllTables(prefix = "06") {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const queries = {
    role: "SELECT role_id, role_name FROM role ORDER BY role_id",
    app_user: "SELECT user_id, full_name, email, '[MASKED]' AS password_hash, role_id FROM app_user ORDER BY user_id",
    vendor: "SELECT vendor_id, name, registration_number, contact_email, contact_phone FROM vendor ORDER BY vendor_id",
    standard_clause: `
      SELECT standard_clause_id, clause_type, clause_text, 
             vector_dims(embedding) AS vector_dims, 
             left(embedding::text, 40) || '...' AS embedding_preview 
      FROM standard_clause ORDER BY standard_clause_id
    `,
    contract: "SELECT contract_id, vendor_id, created_by, title, contract_type, status, start_date, end_date FROM contract ORDER BY contract_id",
    clause: `
      SELECT clause_id, contract_id, clause_text, clause_type, is_flagged, 
             vector_dims(embedding) AS vector_dims, 
             left(embedding::text, 40) || '...' AS embedding_preview 
      FROM clause ORDER BY clause_id
    `,
    approval_step: "SELECT approval_id, contract_id, approver_id, status, acted_at FROM approval_step ORDER BY approval_id",
    milestone: "SELECT milestone_id, contract_id, description, due_date, amount, status FROM milestone ORDER BY milestone_id",
    review_queue: "SELECT review_id, clause_id, reviewed_by, flagged_at, resolution_status FROM review_queue ORDER BY review_id",
    audit_log: "SELECT log_id, user_id, action, entity, entity_id, created_at FROM audit_log ORDER BY log_id DESC"
  };

  let combined = `=== DML EVIDENCE: ALL TABLES (${prefix}) ===\n\n`;

  for (const [table, sql] of Object.entries(queries)) {
    console.log(`Dumping table: ${table}...`);
    const res = await pool.query(sql);
    const tableOut = `--- TABLE: ${table} (Count: ${res.rows.length}) ---\nSQL: ${sql.trim()}\n\n` + formatTable(res.rows);
    combined += tableOut + "\n\n";

    // Also write individual file for chapter 6
    const fileName = prefix === "06" ? `06-table-${table}.txt` : `${prefix}-${table}.txt`;
    fs.writeFileSync(path.join(screenshotsDir, fileName), tableOut);
  }

  const combinedFileName = prefix === "06" ? "06-all-tables-data.txt" : `${prefix}-all-tables-data.txt`;
  fs.writeFileSync(path.join(screenshotsDir, combinedFileName), combined);
  console.log(`DML evidence (${prefix}) saved successfully.`);
}

async function run() {
  try {
    await dumpAllTables("06");
  } catch (err) {
    console.error("Error dumping DML:", err);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("collect-dml.mjs")) {
  run();
}
