# LexiContract Evidence Index & Chapter Mapping

This document maps all real output evidence files collected in `screenshots/` to their respective report chapters for the LexiContract final DBMS submission.

---

## Chapter 5: Data Definition Language (DDL)

| Item | File Path | Description |
| :---: | :--- | :--- |
| **01** | `screenshots/01-tables-and-views.txt` | Complete list of all 10 relational tables and 1 view in `public` schema. |
| **02** | `screenshots/02-columns-types-defaults.txt` | Column definitions, data types, nullability, and default expressions. |
| **03** | `screenshots/03-constraints.txt` | Relational constraints: Primary Keys, Foreign Keys (with ON DELETE behavior), Unique, and Check constraints. |
| **04** | `screenshots/04-indexes.txt` | Database indexes including B-tree indexes and the two HNSW pgvector cosine distance indexes (`vector_cosine_ops`). |
| **05** | `screenshots/05-view-and-extension.txt` | SQL definition of view `v_pending_contract_reviews` and `vector` extension version details. |

---

## Chapter 6: Data Manipulation Language (DML)

| Item | File Path | Description |
| :---: | :--- | :--- |
| **06** | `screenshots/06-all-tables-data.txt` | Initial SELECT * from all 10 tables with row counts and masked credentials. |
| **06 (ind.)** | `screenshots/06-table-<name>.txt` | Individual initial snapshot per table (`role`, `app_user`, `vendor`, `contract`, etc.). |
| **06x** | `screenshots/06x-final-all-tables-data.txt` | Final SELECT * from all tables reflecting post-workflow state. |
| **06x (ind.)**| `screenshots/06x-final-<name>.txt` | Individual final snapshot per table with updated approval steps, audit log, and contracts. |
| **06y** | `screenshots/06y-after-flagging-<name>.txt` | Post-AI-flagging snapshot of `standard_clause`, `clause`, and `review_queue`. |

---

## Chapter 7: SQL Queries & Relational Operations

| Item | File Path | Description |
| :---: | :--- | :--- |
| **07** | `screenshots/07-group-by-aggregate.txt` | Aggregate query grouping contracts by lifecycle status with counts. |
| **08** | `screenshots/08-correlated-query.txt` | Correlated subquery selecting milestones exceeding parent contract average. |
| **09** | `screenshots/09-nested-query.txt` | Nested subquery joining contracts with milestone sum aggregates from reports API. |
| **10** | `screenshots/10-having-and-view.txt` | Aggregate query with `HAVING COUNT(*) >= 2` plus `SELECT * FROM v_pending_contract_reviews`. |
| **11** | `screenshots/11-update-approval-demo.txt` | Real UPDATE demonstration through multi-party approval state transitions. |
| **12** | `screenshots/12-delete-demo.txt` | Controlled DELETE verification (count before, insert temp, delete temp, count after). |

*Note: All Chapter 7 queries are also permanently documented in `docs/important-queries.md`.*

---

## Chapter 8: Stored Functions, Triggers & Transactions

| Item | File Path | Description |
| :---: | :--- | :--- |
| **13** | `screenshots/13-function-and-trigger-defs.txt` | SQL definitions (`pg_get_functiondef` / `pg_get_triggerdef`) for functions and triggers. |
| **14** | `screenshots/14-contract-summary-function.txt` | Execution output of stored procedure `get_contract_summary(1)`. |
| **15** | `screenshots/15-test-embed.txt` | Execution of local transformer embedding pipeline (similarity: 0.670 vs 0.100). |
| **16** | `screenshots/16-test-rollback.txt` | Proof of atomic transaction ROLLBACK on error (0 leaked rows). |
| **17** | `screenshots/17-approval-flow-audit.txt` | Multi-party sign-off lifecycle and trigger `trg_contract_status_audit` user attribution (`user_id = 1`). |
| **18** | `screenshots/18-milestone-date-trigger-rejection.txt` | Proof of `trg_check_milestone_date` trigger actively rejecting invalid milestone dates. |
| **19** | `screenshots/19-seed-standard-clauses.txt` | Seed 8 standard clauses with 384-dimensional pgvector embeddings. |
| **19b**| `screenshots/19b-similarity-tests.txt` | Direct testing of `find_similar_standard_clauses` (exact: 1.000, paraphrase: 0.630, unrelated: 0.087). |
| **20** | `screenshots/20-flagging-demo.txt` | Live demo: safe clause accepted (sim 0.630), risky clause flagged (sim 0.382) into review queue, and resolved. |

---

## Chapter 9: User Interface & Role-Based Workflows

Capture these directly from your running browser (`http://localhost:3000`) using `Win + Shift + S`:

- **Admin Session (`aakashagarwal126@gmail.com`)**:
  - `21-ui-admin-dashboard.png` -> `http://localhost:3000` (Welcome Admin, navigation cards)
  - `22-ui-admin-vendors.png` -> `http://localhost:3000/vendors` (Vendor list + Add Vendor form)
  - `23-ui-admin-contracts.png` -> `http://localhost:3000/contracts` (Contract table + Add Contract form)
  - `24-ui-admin-contract-detail.png` -> `http://localhost:3000/contracts/1` (Summary cards, Approval Workflow, Clauses, Add Clause form, Milestones)
  - `25-ui-admin-review-queue.png` -> `http://localhost:3000/review-queue` (Risk audit queue table and action buttons)
  - `26-ui-admin-reports.png` -> `http://localhost:3000/reports` (Portfolio analytics and risk audit summary)
- **Reviewer Session (`krishg@gmail.com`)**:
  - `27-ui-reviewer-contract-detail.png` -> `http://localhost:3000/contracts/1` (Shows contract details, but Add Clause and Add Milestone forms are hidden)
  - `28-ui-reviewer-vendors.png` -> `http://localhost:3000/vendors` (Shows vendor list, but Add Vendor form is hidden)
