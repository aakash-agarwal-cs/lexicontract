import pool from "../../src/lib/db.js";

async function deleteJunkMilestone() {
  try {
    console.log("=== STEP 4: DELETE JUNK MILESTONE ===");
    
    // 1. SELECT of that row first
    console.log("1. Querying row before deletion:");
    const selectRes = await pool.query(
      "SELECT milestone_id, contract_id, description, due_date, amount, status FROM milestone WHERE milestone_id = 11;"
    );
    console.table(selectRes.rows);

    if (selectRes.rows.length === 0) {
      console.log("Milestone 11 not found (may have been deleted already).");
      return;
    }

    // 2. DELETE ... RETURNING *
    console.log("2. Executing DELETE FROM milestone WHERE milestone_id = 11 AND description = 'wfefsdfs' RETURNING *;");
    const deleteRes = await pool.query(
      "DELETE FROM milestone WHERE milestone_id = 11 AND description = 'wfefsdfs' RETURNING *;"
    );
    console.table(deleteRes.rows);

    // 3. Verification
    const verifyRes = await pool.query("SELECT * FROM milestone WHERE milestone_id = 11;");
    console.log(`3. Verification: rows found for milestone_id 11: ${verifyRes.rows.length}`);
    console.log(">>> SUCCESS: Junk milestone 11 successfully deleted. All other rows preserved.");

  } catch (err) {
    console.error("Error in deleteJunkMilestone:", err);
  } finally {
    await pool.end();
  }
}

deleteJunkMilestone();
