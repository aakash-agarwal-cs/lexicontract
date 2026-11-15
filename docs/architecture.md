# LexiContract System Architecture & Transaction Flows

This document details the architectural layout, technology stack, and atomic transaction workflows of LexiContract.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser"]
        UI["React UI (Next.js App Router)"]
        Dashboard["/ (Dashboard)"]
        Contracts["/contracts & /contracts/[id]"]
        ReviewQueue["/review-queue"]
        Reports["/reports"]
    end

    subgraph Server ["Next.js Server (Node.js)"]
        API["API Route Handlers (/api/*)"]
        AuthMiddleware["JWT Session Auth (jose)"]
        LocalModel["@huggingface/transformers<br/>(Xenova/all-MiniLM-L6-v2, 384 dims)"]
        PGPool["pg.Pool Connection Pooler"]
    end

    subgraph Database ["Supabase PostgreSQL + pgvector"]
        Tables[("10 Relational Tables")]
        VectorIndex["HNSW Vector Index (vector_cosine_ops)"]
        StoredFuncs["find_similar_standard_clauses()<br/>get_contract_summary()"]
        Triggers["trg_contract_status_audit<br/>trg_check_milestone_date"]
        AuditTable[("audit_log")]
    end

    UI --> Dashboard & Contracts & ReviewQueue & Reports
    Dashboard & Contracts & ReviewQueue & Reports --> API
    API --> AuthMiddleware
    API --> LocalModel
    LocalModel -.->|384 float vector| API
    API --> PGPool
    PGPool --> Database
    Database --> Tables & VectorIndex & StoredFuncs & Triggers & AuditTable
```

---

## 2. Component Breakdown

1. **Client Tier**: Next.js App Router with React Client Components (`"use client"`), Tailwind CSS styling, responsive tables, forms, and role-conditioned UI controls.
2. **Application Tier**:
   - Next.js Server API Routes running on Node.js.
   - Session authentication managed via HMAC-SHA256 signed JWT cookies (`jose` library).
   - Local Embedding Engine: `@huggingface/transformers` running the `Xenova/all-MiniLM-L6-v2` ONNX pipeline locally. Embeddings are generated in-process before database transactions begin, keeping transactions fast and avoiding external API latencies.
3. **Database Tier**: Supabase PostgreSQL 15+ with the `pgvector` extension.
   - HNSW index on `vector(384)` with `vector_cosine_ops` for fast similarity lookup.
   - Stored SQL procedures for analytics and vector cosine calculations.
   - Event triggers enforcing date integrity and auditing contract state transitions.

---

## 3. Transaction Flow 1: Clause Insertion & Risk Audit

Guarantees atomicity: a clause is either fully created (and queued for review if risky) or completely rolled back if any error occurs.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant API as /api/contracts/[id]/clauses
    participant Model as Local MiniLM-L6-v2 Model
    participant DB as PostgreSQL Transaction (client)

    Admin->>API: POST { clause_text, clause_type }
    API->>API: Verify ADMIN role & contract validity
    API->>Model: embed(clause_text) [OUTSIDE TX]
    Model-->>API: 384-dimensional vector array
    API->>DB: BEGIN
    API->>DB: INSERT INTO clause (...) RETURNING clause_id
    API->>DB: SELECT * FROM find_similar_standard_clauses(...)
    alt Similarity < 0.6 (Risk Flagged)
        API->>DB: UPDATE clause SET is_flagged = TRUE
        API->>DB: INSERT INTO review_queue (clause_id)
    else Similarity >= 0.6 or No Standards
        API->>DB: Clause kept safe (is_flagged = FALSE)
    end
    alt Any Error Occurs
        API->>DB: ROLLBACK
        DB-->>API: Transaction cancelled (no orphaned rows)
    else All Operations Succeed
        API->>DB: COMMIT
        DB-->>API: Persisted
    end
    API-->>Admin: { clause, flagged, best_similarity, message }
```

---

## 4. Transaction Flow 2: Multi-Party Approval & Audit Trigger

Guarantees atomic sign-off and feeds the PostgreSQL status audit trigger with the acting user ID.

```mermaid
sequenceDiagram
    autonumber
    actor Approver as Admin or Reviewer
    participant API as /api/contracts/[id]/approve
    participant DB as PostgreSQL Transaction (client)
    participant Trigger as trg_contract_status_audit

    Approver->>API: POST { decision: 'APPROVED' | 'REJECTED' }
    API->>API: Authenticate session (get session.userId)
    API->>DB: BEGIN
    API->>DB: SELECT set_config('app.user_id', session.userId, true)
    API->>DB: UPDATE approval_step SET status = decision WHERE approver_id = session.userId
    alt Decision == 'REJECTED'
        API->>DB: UPDATE contract SET status = 'DRAFT'
        DB->>Trigger: Fire AFTER UPDATE ON contract
        Trigger->>DB: INSERT INTO audit_log (user_id, action, entity, entity_id)
    else Decision == 'APPROVED' and Remaining Pending == 0
        API->>DB: UPDATE contract SET status = 'ACTIVE'
        DB->>Trigger: Fire AFTER UPDATE ON contract
        Trigger->>DB: INSERT INTO audit_log (user_id, action, entity, entity_id)
    else Decision == 'APPROVED' and Steps Still Pending
        Note over DB: Contract status remains PENDING_APPROVAL
    end
    API->>DB: COMMIT
    API-->>Approver: { success: true, contract_status }
```
