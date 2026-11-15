import pool from "@/lib/db";
import { getSession } from "@/lib/auth";
import { embed, toVectorString } from "@/lib/embeddings";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const res = await pool.query(
      "SELECT * FROM clause WHERE contract_id = $1 ORDER BY clause_id ASC",
      [contractId]
    );

    return NextResponse.json({ clauses: res.rows });
  } catch (err) {
    console.error("Error in GET /api/contracts/[id]/clauses:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const contractId = parseInt(id, 10);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    const body = await request.json();
    const { clause_text, clause_type } = body;

    if (!clause_text || !clause_text.trim()) {
      return NextResponse.json({ error: "clause_text is required" }, { status: 400 });
    }
    if (!clause_type || !clause_type.trim()) {
      return NextResponse.json({ error: "clause_type is required" }, { status: 400 });
    }

    // Verify contract exists
    const contractCheck = await pool.query(
      "SELECT contract_id FROM contract WHERE contract_id = $1",
      [contractId]
    );
    if (contractCheck.rows.length === 0) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // 1. Compute embedding OUTSIDE the database transaction
    const embedding = await embed(clause_text.trim());
    const vectorStr = toVectorString(embedding);

    // 2. Run the database transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert clause
      const insertRes = await client.query(
        `INSERT INTO clause (contract_id, clause_text, clause_type, embedding, is_flagged)
         VALUES ($1, $2, $3, $4::vector, FALSE)
         RETURNING clause_id, contract_id, clause_text, clause_type, is_flagged`,
        [contractId, clause_text.trim(), clause_type.trim(), vectorStr]
      );
      const newClause = insertRes.rows[0];
      const clauseId = newClause.clause_id;

      // Check standard clauses count
      const stdCountRes = await client.query("SELECT COUNT(*) FROM standard_clause");
      const totalStdClauses = parseInt(stdCountRes.rows[0].count, 10);

      let flagged = false;
      let bestSimilarity = null;
      let message = "";

      if (totalStdClauses === 0) {
        message = "Standard clauses table is empty; clause not flagged.";
      } else {
        const simRes = await client.query(
          "SELECT * FROM find_similar_standard_clauses($1::vector, $2, 3)",
          [vectorStr, clause_type.trim()]
        );

        if (simRes.rows.length > 0) {
          bestSimilarity = parseFloat(simRes.rows[0].similarity);
          if (bestSimilarity < 0.6) {
            flagged = true;
            await client.query(
              "UPDATE clause SET is_flagged = TRUE WHERE clause_id = $1",
              [clauseId]
            );
            await client.query(
              "INSERT INTO review_queue (clause_id) VALUES ($1)",
              [clauseId]
            );
            message = "Clause flagged due to low similarity with standard clause.";
          } else {
            message = "Clause matches standard clause sufficiently.";
          }
        } else {
          message = "No standard clauses found for this clause type; clause not flagged.";
        }
      }

      newClause.is_flagged = flagged;
      await client.query("COMMIT");

      return NextResponse.json({
        clause: newClause,
        flagged,
        best_similarity: bestSimilarity,
        message,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error in POST /api/contracts/[id]/clauses:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
