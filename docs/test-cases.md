# LexiContract Test Cases

| Test ID | Feature | Steps | Expected Result | Actual Result | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | Vendors | Navigate to `/vendors`, fill out Add Vendor form (Admin), click submit | Vendor is created and appears in list | Vendor created and shown in table | Pass |
| TC-02 | Contracts | Navigate to `/contracts`, select vendor, fill contract details, submit | New contract created in DRAFT status | Contract created successfully | Pass |
| TC-03 | Milestones | Open contract details page `/contracts/[id]`, add milestone with date & amount | Milestone added to contract timeline | Milestone created and listed | Pass |
| TC-04 | Milestone Date Trigger | Create a milestone with `due_date` prior to contract `start_date` or after `end_date` | Database trigger rejects insertion with constraint error | Trigger raised exception as expected | Pass |
| TC-05 | Contract Summary Function | Call `SELECT * FROM get_contract_summary(contract_id)` in SQL | Returns relational table with total_milestones, completed_milestones, total_value, completed_value | Returned table for contract 1: (3, 1, 50000.00, 15000.00) | Pass |
| TC-06 | Reports | Navigate to `/reports` | Displays contracts per status, vendor breakdown, above-avg value, flagged contracts, total vendors | All 5 report sections load with real data | Pass |
| TC-07 | Role Restrictions | Log in as reviewer (`krishg@gmail.com`), check `/vendors` and `/contracts` | Add Vendor/Contract forms and delete buttons are hidden | Forms and action buttons hidden for Reviewer | Pass |

## Aakash's tests

| Test ID | Feature | Steps | Expected Result | Actual Result | Pass/Fail |
|---|---|---|---|---|---|
| AT-01 | Standard Clause Seeding | Execute `scripts/seed-standard-clauses.mjs` with 8 templates from `data/standard_clauses.json` | 8 standard clauses inserted into `standard_clause`, each with 384-dimensional dense vector | Successfully inserted 8 standard clauses; `vector_dims(embedding) = 384` across all 8 rows (`19-seed-standard-clauses.txt`) | Pass |
| AT-02 | Cosine Similarity Function | Execute `find_similar_standard_clauses` with exact embedding, paraphrase, and unrelated sentence | Exact match $\approx$ 1.000, paraphrase > 0.600, unrelated < 0.600 | Exact match = 1.0000, paraphrase = 0.6296, unrelated sentence = 0.0875 (`19b-similarity-tests.txt`) | Pass |
| AT-03 | Safe Clause Ingestion | Add balanced Termination paraphrase to Contract 1 via `POST /api/contracts/1/clauses` | Clause inserted, best similarity $\ge$ 0.600, `is_flagged = FALSE`, no review queue entry | Clause 5 created, similarity = 0.6296, `is_flagged = false`, 0 review queue rows (`20-flagging-demo.txt`) | Pass |
| AT-04 | Risky Clause Ingestion & Flagging | Add one-sided cancellation clause to Contract 1 via `POST /api/contracts/1/clauses` | Clause inserted, similarity < 0.600, `is_flagged = TRUE`, auto-enqueued in `review_queue` | Clause 6 created, similarity = 0.3824, `is_flagged = true`, enqueued as review item 2 (`20-flagging-demo.txt`) | Pass |
| AT-05 | Review Queue Item Resolution | Send `PATCH /api/review-queue/2` with `{ resolution_status: 'ACCEPTED' }` as Admin | `resolution_status` updated to 'ACCEPTED', `reviewed_by` set to acting user ID (1) | Review item 2 updated: `resolution_status = 'ACCEPTED'`, `reviewed_by = 1` (`20-flagging-demo.txt`) | Pass |
| AT-06 | Multi-Party Sign-Off & Audit Trigger | Complete dual approvals on Contract 1 (Krish then Aakash); check `contract.status` and `audit_log` | Contract transitions `PENDING_APPROVAL` $\rightarrow$ `ACTIVE`, `audit_log` records `user_id = 1` via `app.user_id` | Contract 1 status is 'ACTIVE', both steps 'APPROVED', `audit_log` log 5 records `user_id = 1`, `action = 'STATUS PENDING_APPROVAL -> ACTIVE'` (`17-approval-flow-audit.txt`) | Pass |
| AT-07 | Transaction Rollback Integrity | Execute `scripts/test-rollback.mjs`: insert clause inside BEGIN, simulate error, execute ROLLBACK | Transaction rolls back; 0 leaked rows in database | Caught error, executed ROLLBACK, verification query returned 0 rows for clause_type 'TEST' (`16-test-rollback.txt`) | Pass |
| AT-08 | Milestone Date Range Trigger | Attempt inserting milestone with due date '2029-12-31' outside Contract 1 validity (2026-01-01 to 2027-01-01) | `trg_check_milestone_date` raises exception, database rejects insert | Raised exception "Milestone due_date must fall within contract validity period", 0 rows inserted (`18-milestone-date-trigger-rejection.txt`) | Pass |
| AT-09 | RBAC API Guard | Send `POST /api/contracts/1/clauses` with Reviewer session token | API returns HTTP 403 "Forbidden: Admins only" | Route evaluates `session.role !== 'ADMIN'` and returns status 403 Forbidden | Pass |
| AT-10 | RBAC UI Guard | Log in as Reviewer (`krishg@gmail.com`) and navigate to `/contracts` | "Add New Contract" form is hidden, showing reviewer notification notice | Form wrapped with `user?.role === 'ADMIN' ? (...) : (...)`, reviewer sees restricted notice (`src/app/contracts/page.js:167`) | Pass |
