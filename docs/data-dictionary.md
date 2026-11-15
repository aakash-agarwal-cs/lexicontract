# LexiContract Data Dictionary

This document maps out all 10 relational database tables and the view in the LexiContract system, extracted directly from PostgreSQL `information_schema` and `pg_catalog`.

---

## 1. Relational Tables

### 1. `role`
Defines role-based access control authorization tiers (`ADMIN`, `REVIEWER`).

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `role_id` | `integer` | NO | `nextval('role_role_id_seq')` | PRIMARY KEY | Unique identifier for the role |
| `role_name` | `varchar` | NO | *None* | UNIQUE | Unique name of the security clearance role |

---

### 2. `app_user`
Stores registered user accounts, bcrypt hashed credentials, and role associations.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `user_id` | `integer` | NO | `nextval('app_user_user_id_seq')` | PRIMARY KEY | Unique identifier for the user |
| `full_name` | `varchar` | NO | *None* | *None* | Full legal or corporate name of user |
| `email` | `varchar` | NO | *None* | UNIQUE | Unique login email address |
| `password_hash` | `varchar` | NO | *None* | *None* | Secure bcrypt password hash |
| `role_id` | `integer` | NO | *None* | FOREIGN KEY -> `role(role_id)` | Role-based authorization clearance ID |

---

### 3. `vendor`
Third-party vendors, suppliers, and contractors doing business with the enterprise.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `vendor_id` | `integer` | NO | `nextval('vendor_vendor_id_seq')` | PRIMARY KEY | Unique identifier for the vendor |
| `name` | `varchar` | NO | *None* | *None* | Legal registered company name |
| `registration_number` | `varchar` | YES | *None* | UNIQUE | Official tax / business registration number |
| `contact_email` | `varchar` | YES | *None* | *None* | Primary business contact email |
| `contact_phone` | `varchar` | YES | *None* | *None* | Primary business contact telephone |

---

### 4. `standard_clause`
Curated benchmark legal clauses with 384-dimensional vector embeddings for risk comparison.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `standard_clause_id` | `integer` | NO | `nextval('standard_clause_standard_clause_id_seq')` | PRIMARY KEY | Unique standard clause identifier |
| `clause_type` | `varchar` | NO | *None* | *None* | Legal clause category (e.g., Termination, Liability Cap) |
| `clause_text` | `text` | NO | *None* | *None* | Standard balanced template clause wording |
| `embedding` | `vector(384)` | NO | *None* | HNSW Cosine Index | 384-dim dense embedding vector from all-MiniLM-L6-v2 |

---

### 5. `contract`
Parent contract records tracking vendor agreements, lifecycle statuses, and validity dates.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `contract_id` | `integer` | NO | `nextval('contract_contract_id_seq')` | PRIMARY KEY | Unique identifier for the contract |
| `vendor_id` | `integer` | NO | *None* | FOREIGN KEY -> `vendor(vendor_id)` | Associated vendor |
| `created_by` | `integer` | NO | *None* | FOREIGN KEY -> `app_user(user_id)` | User who authored the contract |
| `title` | `varchar` | NO | *None* | *None* | Title and subject of the agreement |
| `contract_type` | `varchar` | YES | *None* | CHECK (`MSA`, `SOW`, `NDA`) | Formal contractual classification |
| `status` | `varchar` | YES | `'DRAFT'` | CHECK (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `EXPIRED`, `TERMINATED`) | Current lifecycle state |
| `start_date` | `date` | YES | *None* | *None* | Contract validity commencement date |
| `end_date` | `date` | YES | *None* | CHECK (`end_date >= start_date`) | Contract expiration or renewal deadline |

---

### 6. `clause`
Contractual clauses analyzed via pgvector cosine similarity against standard templates.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `clause_id` | `integer` | NO | `nextval('clause_clause_id_seq')` | PRIMARY KEY | Unique clause identifier |
| `contract_id` | `integer` | NO | *None* | FOREIGN KEY -> `contract(contract_id)` ON DELETE CASCADE | Associated parent contract |
| `clause_text` | `text` | NO | *None* | *None* | Complete text of contractual clause |
| `clause_type` | `varchar` | NO | *None* | *None* | Legal clause classification |
| `is_flagged` | `boolean` | YES | `FALSE` | *None* | Risk audit flag (TRUE if similarity < 0.600) |
| `embedding` | `vector(384)` | YES | *None* | HNSW Cosine Index | 384-dim dense embedding vector |

---

### 7. `approval_step`
Multi-party approval stages (Admin and Reviewer dual sign-offs) for contract activation.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `approval_id` | `integer` | NO | `nextval('approval_step_approval_id_seq')` | PRIMARY KEY | Unique approval step record ID |
| `contract_id` | `integer` | NO | *None* | FOREIGN KEY -> `contract(contract_id)` | Contract requiring sign-off |
| `approver_id` | `integer` | NO | *None* | FOREIGN KEY -> `app_user(user_id)` | User assigned to approve or reject |
| `status` | `varchar` | NO | `'PENDING'` | CHECK (`PENDING`, `APPROVED`, `REJECTED`) | State of this approval step |
| `acted_at` | `timestamp` | YES | *None* | *None* | Timestamp when decision was submitted |

---

### 8. `milestone`
Project deliverables, payment amounts, and execution schedules tied to contracts.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `milestone_id` | `integer` | NO | `nextval('milestone_milestone_id_seq')` | PRIMARY KEY | Unique milestone identifier |
| `contract_id` | `integer` | NO | *None* | FOREIGN KEY -> `contract(contract_id)` | Associated parent contract |
| `description` | `text` | NO | *None* | *None* | Scope and deliverable requirements |
| `due_date` | `date` | NO | *None* | Trigger Validated | Due date (must fall within contract validity period) |
| `amount` | `numeric` | NO | *None* | *None* | Deliverable payout value |
| `status` | `varchar` | NO | `'PENDING'` | CHECK (`PENDING`, `COMPLETED`, `OVERDUE`) | Milestone completion status |

---

### 9. `review_queue`
Risk audit escalation queue holding flagged high-risk clauses for human legal review.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `review_id` | `integer` | NO | `nextval('review_queue_review_id_seq')` | PRIMARY KEY | Unique review queue item ID |
| `clause_id` | `integer` | NO | *None* | UNIQUE, FOREIGN KEY -> `clause(clause_id)` ON DELETE CASCADE | Flagged high-risk clause |
| `reviewed_by` | `integer` | YES | *None* | FOREIGN KEY -> `app_user(user_id)` ON DELETE SET NULL | Reviewer who resolved the flag |
| `flagged_at` | `timestamp` | YES | `CURRENT_TIMESTAMP` | *None* | Timestamp when AI flagged the clause |
| `resolution_status` | `varchar` | YES | `'UNRESOLVED'` | CHECK (`UNRESOLVED`, `ACCEPTED`, `REJECTED`) | Audit resolution state |

---

### 10. `audit_log`
Immutable audit ledger recording lifecycle status transitions, populated by database trigger.

| Column | Type | Nullable | Default | Key / Constraint | Description |
|---|---|---|---|---|---|
| `log_id` | `integer` | NO | `nextval('audit_log_log_id_seq')` | PRIMARY KEY | Unique audit log entry ID |
| `user_id` | `integer` | YES | *None* | FOREIGN KEY -> `app_user(user_id)` | User who made change (from `app.user_id` session config) |
| `action` | `varchar` | NO | *None* | *None* | Action description (e.g., `STATUS PENDING_APPROVAL -> ACTIVE`) |
| `entity` | `varchar` | NO | *None* | *None* | Database entity modified (`contract`) |
| `entity_id` | `integer` | NO | *None* | *None* | Primary key ID of modified entity |
| `created_at` | `timestamp` | YES | `CURRENT_TIMESTAMP` | *None* | Timestamp of audit event |

---

## 2. Views

### `v_pending_contract_reviews`
Aggregates contracts with unresolved risk-flagged clauses in the review queue.

```sql
SELECT c.contract_id,
       c.title AS contract_title,
       c.status AS contract_status,
       v.name AS vendor_name,
       COUNT(rq.review_id)::integer AS pending_reviews_count
FROM contract c
JOIN vendor v ON c.vendor_id = v.vendor_id
JOIN clause cl ON c.contract_id = cl.contract_id
JOIN review_queue rq ON cl.clause_id = rq.clause_id
WHERE rq.resolution_status = 'UNRESOLVED'
GROUP BY c.contract_id, c.title, c.status, v.name;
```
