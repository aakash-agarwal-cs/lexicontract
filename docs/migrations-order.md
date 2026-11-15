# LexiContract Database Migrations & Setup Order

This document provides the exact chronological migration order, purpose of each script, and how to execute them from scratch on a clean Supabase PostgreSQL database.

---

## 1. Migration Sequence

| Step | File Path | Migration Name | Description & DBMS Purpose |
| :---: | :--- | :--- | :--- |
| **0** | *(Initial Schema)* | Base Tables DDL | Creates `role`, `app_user`, `vendor`, `standard_clause`, `contract`, `clause`, `approval_step`, `milestone`, `review_queue`, `audit_log`, and view `v_pending_contract_reviews`. |
| **1** | `db/migrations/001_fixes.sql` | Schema Fixes & Indexes | Renames `embedding_id` to `embedding vector(384)`, adds CHECK constraints (`chk_contract_status`, `chk_contract_dates`, etc.), creates HNSW cosine indexes (`vector_cosine_ops`), and inserts default roles (`ADMIN`, `REVIEWER`). |
| **2** | `db/migrations/002_audit_trigger.sql` | Contract Status Audit Trigger | Makes `audit_log.user_id` nullable, creates `log_contract_status_change()` trigger function, and attaches `trg_contract_status_audit` AFTER UPDATE ON `contract`. |
| **3** | `db/migrations/003_milestone_date_trigger.sql` | Milestone Date Validation Trigger | Creates `check_milestone_date_range()` trigger function and attaches `trg_check_milestone_date` BEFORE INSERT/UPDATE ON `milestone` to validate due dates. |
| **4** | `db/migrations/004_contract_summary_function.sql` | Contract Summary Stored Function | Creates stored function `get_contract_summary(p_contract_id)` returning milestone aggregates (`total_milestones`, `completed_milestones`, `total_value`, `completed_value`). |
| **5** | `db/migrations/005_similarity_function.sql` | Vector Similarity Stored Function | Creates stored function `find_similar_standard_clauses(vector(384), VARCHAR, INT)` returning ranked clauses by cosine similarity (`1 - (embedding <=> query)`). |

---

## 2. Seed Data Execution Order

Once migrations 001–005 are applied, seed the database in this order:

1. **User Registration**:
   - Register the primary administrator account (e.g., `aakashagarwal126@gmail.com`) via the `/login` registration interface or direct insert into `app_user`.
   - Update role to `ADMIN` in table `app_user` for the admin account.
   - Register a second user (e.g. `Krish`, `krishg@gmail.com`) who defaults to `REVIEWER`.

2. **Base Vendors & Contracts (`db/seed.sql`)**:
   - Populates initial vendors (`Acme Supplies`, `Globex Logistics`) and parent contracts.
   - Run in Supabase SQL Editor:
     ```sql
     -- db/seed.sql
     ```

3. **Contract Milestones (`db/seed_milestones.sql`)**:
   - Inserts delivery and payment milestones for the contracts.
   - Run in Supabase SQL Editor:
     ```sql
     -- db/seed_milestones.sql
     ```

4. **Approval Workflow Steps (`db/seed_approval_steps.sql`)**:
   - Idempotently creates dual approval steps for Contract 1 (Admin sign-off and Reviewer sign-off) and sets Contract 1 status to `PENDING_APPROVAL`.
   - Run in Supabase SQL Editor:
     ```sql
     -- db/seed_approval_steps.sql
     ```

5. **Standard Clauses with Vector Embeddings (`scripts/seed-standard-clauses.mjs`)**:
   - When `data/standard_clauses.json` is provided, generate embeddings and populate `standard_clause`:
     ```powershell
     node --env-file=.env.local scripts/seed-standard-clauses.mjs
     ```

---

## 3. How to Run Migrations on Supabase

1. Open your **Supabase Dashboard** -> Select the **LexiContract** project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open each migration file from `db/migrations/` in numerical order (`001_fixes.sql` through `005_similarity_function.sql`).
5. Copy and paste the contents into the SQL Editor, then click **Run** (or press `Ctrl+Enter`).
6. Confirm the console reports `Success. No rows returned`.
