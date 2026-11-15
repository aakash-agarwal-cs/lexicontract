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

async function collectDDL() {
  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // 01: Tables and Views
    console.log("Collecting 01-tables-and-views...");
    const q1 = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_type, table_name;
    `);
    fs.writeFileSync(
      path.join(screenshotsDir, "01-tables-and-views.txt"),
      "=== 01: TABLES AND VIEWS (PUBLIC SCHEMA) ===\n\n" + formatTable(q1.rows)
    );

    // 02: Columns / Types / Defaults per table
    console.log("Collecting 02-columns-types-defaults...");
    const q2 = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);
    fs.writeFileSync(
      path.join(screenshotsDir, "02-columns-types-defaults.txt"),
      "=== 02: COLUMNS, TYPES, AND DEFAULTS PER TABLE ===\n\n" + formatTable(q2.rows)
    );

    // 03: Constraints (PK, FK, UNIQUE, CHECK via pg_get_constraintdef)
    console.log("Collecting 03-constraints...");
    const q3 = await pool.query(`
      SELECT 
        conrelid::regclass::text AS table_name,
        conname AS constraint_name,
        CASE contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'c' THEN 'CHECK'
          ELSE contype::text
        END AS constraint_type,
        pg_get_constraintdef(c.oid, true) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
      ORDER BY conrelid::regclass::text, contype, conname;
    `);
    fs.writeFileSync(
      path.join(screenshotsDir, "03-constraints.txt"),
      "=== 03: DATABASE CONSTRAINTS (PK, FK, UNIQUE, CHECK) ===\n\n" + formatTable(q3.rows)
    );

    // 04: Indexes including HNSW cosine indexes
    console.log("Collecting 04-indexes...");
    const q4 = await pool.query(`
      SELECT 
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS index_definition
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    fs.writeFileSync(
      path.join(screenshotsDir, "04-indexes.txt"),
      "=== 04: INDEXES (INCLUDING PGVECTOR HNSW COSINE INDEXES) ===\n\n" + formatTable(q4.rows)
    );

    // 05: View definition and pgvector extension version
    console.log("Collecting 05-view-and-extension...");
    const q5View = await pool.query(`
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public';
    `);
    const q5Ext = await pool.query(`
      SELECT 
        name,
        default_version,
        installed_version,
        comment
      FROM pg_available_extensions
      WHERE name = 'vector';
    `);
    fs.writeFileSync(
      path.join(screenshotsDir, "05-view-and-extension.txt"),
      "=== 05A: VIEW DEFINITIONS ===\n\n" + formatTable(q5View.rows) +
      "\n=== 05B: PGVECTOR EXTENSION VERSION ===\n\n" + formatTable(q5Ext.rows)
    );

    console.log("DDL evidence collected successfully in screenshots/");
  } catch (err) {
    console.error("Error collecting DDL evidence:", err);
  } finally {
    await pool.end();
  }
}

collectDDL();
