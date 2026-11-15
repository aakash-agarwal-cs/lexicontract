# LexiContract Key SQL Queries & Transactions

This document details the core SQL queries, transactions, functions, and triggers powering the risk audit, approval workflows, and audit logging features.

---

## 1. Vector Similarity Stored Function (`find_similar_standard_clauses`)

Calculates 1 - cosine distance (`<=>`) using pgvector HNSW index to rank matching standard templates.

```sql
CREATE OR REPLACE FUNCTION find_similar_standard_clauses(
  query_embedding vector(384),
  p_clause_type VARCHAR,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  standard_clause_id INT,
  clause_type VARCHAR,
  clause_text TEXT,
  similarity DOUBLE PRECISION
)
AS $$
  SELECT sc.standard_clause_id,
         sc.clause_type,
         sc.clause_text,
         1 - (sc.embedding <=> query_embedding) AS similarity
  FROM standard_clause sc
  WHERE sc.clause_type = p_clause_type
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

---

## 2. Clause Insertion and Risk Flagging Transaction

Inserts new contract clause, queries pgvector similarity, flags high-risk clauses (< 0.6 similarity), and registers them into the review queue atomically.

```sql
-- Step 1: Start atomic transaction
BEGIN;

-- Step 2: Insert clause with 384-dimensional pgvector cast
INSERT INTO clause (contract_id, clause_text, clause_type, embedding, is_flagged)
VALUES ($1, $2, $3, $4::vector, FALSE)
RETURNING clause_id;

-- Step 3: Check similarity against benchmark standard clauses
SELECT * FROM find_similar_standard_clauses($4::vector, $3, 3);

-- Step 4: If best similarity < 0.6, mark flagged and route to review queue
UPDATE clause SET is_flagged = TRUE WHERE clause_id = $clause_id;
INSERT INTO review_queue (clause_id) VALUES ($clause_id);

-- Step 5: Commit changes atomically (or ROLLBACK on any failure)
COMMIT;
```

---

## 3. Contract Approval Transaction with Trigger Audit Attribution

Sets session context for audit trigger, records approver's decision, and updates contract status to ACTIVE only when all dual sign-offs complete.

```sql
-- Step 1: Start atomic approval transaction
BEGIN;

-- Step 2: Set transaction-local session variable for audit trigger
SELECT set_config('app.user_id', $session_user_id, true);

-- Step 3: Update caller's own pending approval step
UPDATE approval_step
SET status = $decision, acted_at = CURRENT_TIMESTAMP
WHERE contract_id = $contract_id AND approver_id = $user_id AND status = 'PENDING'
RETURNING *;

-- Step 4: Check if any pending approvals remain for this contract
SELECT COUNT(*) FROM approval_step WHERE contract_id = $contract_id AND status = 'PENDING';

-- Step 5: If REJECTED -> set 'DRAFT'; If APPROVED and remaining = 0 -> set 'ACTIVE'
UPDATE contract SET status = 'ACTIVE' WHERE contract_id = $contract_id;

-- Step 6: Commit transaction (fires trg_contract_status_audit trigger)
COMMIT;
```

---

## 4. Contract Status Audit Trigger Function (`log_contract_status_change`)

Trigger function executed AFTER contract UPDATE to log lifecycle state changes with the acting user ID captured from session config.

```sql
CREATE OR REPLACE FUNCTION log_contract_status_change() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_log (user_id, action, entity, entity_id)
    VALUES (
      NULLIF(current_setting('app.user_id', true), '')::int,
      'STATUS ' || OLD.status || ' -> ' || NEW.status,
      'contract',
      NEW.contract_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contract_status_audit
AFTER UPDATE ON contract
FOR EACH ROW EXECUTE FUNCTION log_contract_status_change();
```

---

## 5. Review Queue Relational Query with Unresolved Precedence

Joins review queue with clause, contract, vendor, and reviewer tables, ordering unresolved items first.

```sql
SELECT 
  rq.review_id,
  rq.clause_id,
  rq.reviewed_by,
  rq.flagged_at,
  rq.resolution_status,
  c.clause_text,
  c.clause_type,
  c.is_flagged,
  ct.contract_id,
  ct.title AS contract_title,
  ct.status AS contract_status,
  v.vendor_id,
  v.name AS vendor_name,
  u.full_name AS reviewer_name
FROM review_queue rq
JOIN clause c ON rq.clause_id = c.clause_id
JOIN contract ct ON c.contract_id = ct.contract_id
JOIN vendor v ON ct.vendor_id = v.vendor_id
LEFT JOIN app_user u ON rq.reviewed_by = u.user_id
ORDER BY 
  CASE WHEN rq.resolution_status = 'UNRESOLVED' THEN 0 ELSE 1 END,
  rq.flagged_at DESC;
```


---

## Chapter 7 Queries

### 7.1 Aggregate Query with GROUP BY (`07`)
Groups contracts by lifecycle status and counts totals.

```sql
SELECT status, COUNT(*)::int AS contract_count
FROM contract
GROUP BY status
ORDER BY contract_count DESC;
```

### 7.2 Correlated Subquery (`08`)
Finds milestones whose amount strictly exceeds the average milestone amount for their parent contract.

```sql
SELECT m.milestone_id, m.contract_id, m.description, m.amount
FROM milestone m
WHERE m.amount > (
  SELECT AVG(m2.amount)
  FROM milestone m2
  WHERE m2.contract_id = m.contract_id
)
ORDER BY m.contract_id, m.milestone_id;
```

### 7.3 Nested Query with Subquery in FROM Clause (`09`)
Aggregates milestone values per contract via an inline subquery and joins with the parent contract.

```sql
SELECT 
  c.contract_id,
  c.title,
  c.status,
  COALESCE(m.total_val, 0) AS total_milestone_value
FROM contract c
LEFT JOIN (
  SELECT contract_id, SUM(amount) AS total_val 
  FROM milestone 
  GROUP BY contract_id
) m ON c.contract_id = m.contract_id
ORDER BY c.contract_id;
```

### 7.4 Aggregate Query with HAVING & View Selection (`10`)
Filters grouped contracts possessing 2 or more milestones using HAVING, and queries the pending reviews view.

```sql
-- HAVING Query
SELECT 
  contract_id, 
  COUNT(*)::int AS milestone_count, 
  SUM(amount) AS total_contract_value
FROM milestone
GROUP BY contract_id
HAVING COUNT(*) >= 2
ORDER BY contract_id;

-- View Query
SELECT * FROM v_pending_contract_reviews;
```

### 7.5 UPDATE Operation (`11`)
Updates approval step decisions and transitions contract status to ACTIVE.

```sql
UPDATE approval_step
SET status = 'APPROVED', acted_at = CURRENT_TIMESTAMP
WHERE contract_id = 1 AND approver_id = $approver_id AND status = 'PENDING';

UPDATE contract
SET status = 'ACTIVE'
WHERE contract_id = 1;
```

### 7.6 Controlled DELETE Operation (`12`)
Deletes an identified single milestone without impacting existing operational data.

```sql
DELETE FROM milestone
WHERE milestone_id = $temporary_milestone_id
RETURNING *;
```
