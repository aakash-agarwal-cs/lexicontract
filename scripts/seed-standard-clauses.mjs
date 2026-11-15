import fs from "fs";
import path from "path";
import pool from "../src/lib/db.js";
import { embed, toVectorString } from "../src/lib/embeddings.js";

async function seedStandardClauses() {
  const filePath = path.join(process.cwd(), "data", "standard_clauses.json");

  if (!fs.existsSync(filePath)) {
    console.log("data/standard_clauses.json not found. Skipping seeding.");
    await pool.end();
    return;
  }

  try {
    const checkRes = await pool.query("SELECT COUNT(*) FROM standard_clause");
    const count = parseInt(checkRes.rows[0].count, 10);
    if (count > 0) {
      console.log(`standard_clause table already has ${count} rows. Skipping.`);
      return;
    }

    const rawData = fs.readFileSync(filePath, "utf-8");
    const clauses = JSON.parse(rawData);

    let inserted = 0;
    for (const item of clauses) {
      const { clause_type, clause_text } = item;
      const embedding = await embed(clause_text);
      const vectorStr = toVectorString(embedding);

      await pool.query(
        "INSERT INTO standard_clause (clause_type, clause_text, embedding) VALUES ($1, $2, $3::vector)",
        [clause_type, clause_text, vectorStr]
      );
      inserted++;
    }

    console.log(`Successfully inserted ${inserted} standard clauses.`);
  } catch (err) {
    console.error("Error seeding standard clauses:", err);
  } finally {
    await pool.end();
  }
}

seedStandardClauses();
