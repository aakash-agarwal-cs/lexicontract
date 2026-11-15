# LexiContract Database Corrections & Schema Audit

This document records the official relational schema, entities, relationships, and discrepancies corrected from the preliminary Phase 4(a) report. All information in this document was extracted directly from live PostgreSQL catalog (`information_schema.columns` and `information_schema.table_constraints`).

---

## 1. Discrepancies Corrected from Preliminary Submission

| Item | Preliminary Report | Corrected Live Schema | Reason / Impact |
| :--- | :--- | :--- | :--- |
| **Total Entities** | 6 entities | **10 entities** | Preliminary report omitted `role`, `standard_clause`, `approval_step`, and `review_queue`. All 10 are required for RBAC, AI vector auditing, multi-party approvals, and review workflows. |
| **User Entity Name** | `user` | **`app_user`** | `USER` is a reserved keyword in PostgreSQL requiring quotes. The project uses `app_user` to prevent SQL parsing errors and naming conflicts. |
| **Vector Storage Column** | `embedding_id` | **`embedding vector(384)`** | `embedding_id` incorrectly implied an integer foreign key. Renamed in migration `001_fixes.sql` to `embedding` holding a 384-dimensional dense vector directly, indexed via HNSW (`vector_cosine_ops`). |
| **Milestone Date Validation** | Application-level only | **Database trigger (`trg_check_milestone_date`)** | Migration `003` enforces at DB level that milestone `due_date` falls within contract start and end dates. |
| **Contract Status Auditing** | Manual application logs | **Database trigger (`trg_contract_status_audit`)** | Migration `002` automatically captures `OLD.status -> NEW.status` with acting `app.user_id` on every update. |

---

## 2. Complete Entity List (10 Entities)

### 1. `role`
Defines role-based access control tiers (`ADMIN`, `REVIEWER`).
- `role_id` (integer, Primary Key)
- `role_name` (varchar, Unique, Not Null)

### 2. `app_user`
System users with hashed credentials and assigned security roles.
- `user_id` (integer, Primary Key)
- `full_name` (varchar, Not Null)
- `email` (varchar, Unique, Not Null)
- `password_hash` (varchar, Not Null)
- `role_id` (integer, Foreign Key -> `role.role_id`, Not Null)

### 3. `vendor`
Third-party suppliers, service providers, and counterparties.
- `vendor_id` (integer, Primary Key)
- `name` (varchar, Not Null)
- `registration_number` (varchar, Unique)
- `contact_email` (varchar)
- `contact_phone` (varchar)

### 4. `standard_clause`
Baseline legal standard clauses with precomputed pgvector embeddings.
- `standard_clause_id` (integer, Primary Key)
- `clause_type` (varchar, Not Null)
- `clause_text` (text, Not Null)
- `embedding` (`vector(384)`, Not Null)

### 5. `contract`
Parent contract records tracking vendor, validity period, and lifecycle status.
- `contract_id` (integer, Primary Key)
- `vendor_id` (integer, Foreign Key -> `vendor.vendor_id`, Not Null)
- `created_by` (integer, Foreign Key -> `app_user.user_id`, Not Null)
- `title` (varchar, Not Null)
- `contract_type` (varchar, Check: `MSA`, `SOW`, `NDA`)
- `status` (varchar, Check: `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `EXPIRED`, `TERMINATED`)
- `start_date` (date)
- `end_date` (date)

### 6. `clause`
Individual contractual clauses analyzed by pgvector cosine similarity.
- `clause_id` (integer, Primary Key)
- `contract_id` (integer, Foreign Key -> `contract.contract_id`, CASCADE, Not Null)
- `clause_text` (text, Not Null)
- `clause_type` (varchar, Not Null)
- `is_flagged` (boolean, Default: `FALSE`)
- `embedding` (`vector(384)`)

### 7. `approval_step`
Dual sign-off approval stages required to transition a contract to `ACTIVE`.
- `approval_id` (integer, Primary Key)
- `contract_id` (integer, Foreign Key -> `contract.contract_id`, Not Null)
- `approver_id` (integer, Foreign Key -> `app_user.user_id`, Not Null)
- `status` (varchar, Check: `PENDING`, `APPROVED`, `REJECTED`, Default: `PENDING`)
- `acted_at` (timestamp, Nullable)

### 8. `milestone`
Deliverable schedules and payment amounts tied to contract timelines.
- `milestone_id` (integer, Primary Key)
- `contract_id` (integer, Foreign Key -> `contract.contract_id`, Not Null)
- `description` (text, Not Null)
- `due_date` (date, Not Null)
- `amount` (numeric, Not Null)
- `status` (varchar, Check: `PENDING`, `COMPLETED`, `OVERDUE`, Default: `PENDING`)

### 9. `review_queue`
Risk audit review queue holding clauses flagged for human legal scrutiny.
- `review_id` (integer, Primary Key)
- `clause_id` (integer, Unique, Foreign Key -> `clause.clause_id`, CASCADE, Not Null)
- `reviewed_by` (integer, Foreign Key -> `app_user.user_id`, Nullable)
- `flagged_at` (timestamp, Default: `CURRENT_TIMESTAMP`)
- `resolution_status` (varchar, Check: `UNRESOLVED`, `ACCEPTED`, `REJECTED`, Default: `UNRESOLVED`)

### 10. `audit_log`
Immutable ledger of lifecycle state changes, populated by triggers.
- `log_id` (integer, Primary Key)
- `user_id` (integer, Foreign Key -> `app_user.user_id`, Nullable)
- `action` (varchar, Not Null)
- `entity` (varchar, Not Null)
- `entity_id` (integer, Not Null)
- `created_at` (timestamp, Default: `CURRENT_TIMESTAMP`)

---

## 3. Verified Relationships (Foreign Keys)

| Child Table | Child Column | Parent Table | Parent Column | Enforced Rule |
| :--- | :--- | :--- | :--- | :--- |
| `app_user` | `role_id` | `role` | `role_id` | RBAC validation |
| `contract` | `vendor_id` | `vendor` | `vendor_id` | Vendor association |
| `contract` | `created_by` | `app_user` | `user_id` | Contract creator |
| `clause` | `contract_id` | `contract` | `contract_id` | ON DELETE CASCADE |
| `approval_step` | `contract_id` | `contract` | `contract_id` | Contract approval step |
| `approval_step` | `approver_id` | `app_user` | `user_id` | Assigned approver |
| `milestone` | `contract_id` | `contract` | `contract_id` | Deliverable schedule |
| `review_queue` | `clause_id` | `clause` | `clause_id` | ON DELETE CASCADE (Unique) |
| `review_queue` | `reviewed_by` | `app_user` | `user_id` | Legal reviewer sign-off |
| `audit_log` | `user_id` | `app_user` | `user_id` | Audit attribution |
