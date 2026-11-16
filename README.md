# LexiContract

**Corporate Vendor Contract Lifecycle & Risk Audit Platform (SQL + pgvector)**

LexiContract is an enterprise-grade contract management and compliance audit application. It combines relational PostgreSQL schema modeling with dense vector embeddings (`pgvector`) to deliver automated risk screening, milestone budget tracking, multi-party approval workflows, and immutable audit logging for vendor agreements.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with `pgvector` extension (hosted on Supabase)
- **Database Driver**: `pg` (node-postgres) with connection pooling
- **AI & Vector Embeddings**: `@huggingface/transformers` (`xenova/all-MiniLM-L6-v2`, 384-dimensional dense vectors)
- **Authentication**: `jose` (stateless signed JWT stored in HTTP-only cookies) & `bcryptjs` (secure password hashing)

---

## Features

- **Vendor & Contract Management**: Complete lifecycle tracking from `DRAFT` to `PENDING_APPROVAL` to `ACTIVE` or `TERMINATED`.
- **Milestone & Budget Tracking**: Milestone scheduling with database trigger enforcement ensuring deliverable due dates fall strictly within parent contract validity windows.
- **AI-Powered Clause Risk Audit**: Local in-memory generation of 384-dimensional dense embeddings for contractual clauses. Real-time cosine similarity search against standard clause benchmarks via pgvector HNSW indexing; non-standard or risky clauses (similarity < 0.600) are automatically enqueued in `review_queue`.
- **Multi-Party Approval Workflow**: Configurable dual-review workflow (Admin and Reviewer sign-offs) required prior to contract activation.
- **Automated Audit Ledger**: Database trigger `trg_contract_status_audit` automatically logs lifecycle state transitions to `audit_log`, capturing the acting user via PostgreSQL session variable `app.user_id`.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN` (creation, deletion, clause submission, approval) and `REVIEWER` (review queue evaluation, co-approval).
- **Executive Analytics & Reporting**: Real-time aggregation of contract distribution, vendor performance, above-average value contracts (correlated CTE subqueries), and pending risk audits (`v_pending_contract_reviews`).

---

## Prerequisites

- **Node.js**: v18 or higher (v20+ recommended)
- **npm**: v9 or higher
- **PostgreSQL Database**: PostgreSQL 15+ with the `vector` (`pgvector`) extension enabled (e.g., Supabase)

---

## Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/aakash-agarwal-cs/lexicontract.git
cd lexicontract
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
JWT_SECRET="your-jwt-secret-key-at-least-32-characters"
```

> **Note on DATABASE_URL**: Always connect using the Supabase **session pooler** connection string (typically port `5432` or `6543`), not the transaction pooler. This allows PostgreSQL transaction-level session variables (`SET LOCAL app.user_id = ...`), required by the audit trigger during contract approval, to persist across statements within a transaction.

---

## Database Setup & Migration Order

The database schema and triggers are executed through SQL scripts in the following order:

### 1. Base Schema / DDL
> **Note**: The repository does not include a standalone `base_schema.sql` file. The foundational schema (the 10 core tables: `role`, `app_user`, `vendor`, `standard_clause`, `contract`, `clause`, `approval_step`, `milestone`, `review_queue`, `audit_log`, and the view `v_pending_contract_reviews`) is initially defined in PostgreSQL as documented in [`docs/data-dictionary.md`](docs/data-dictionary.md).

### 2. Migrations (`db/migrations/`)
Execute the SQL migration scripts in numerical order using the Supabase SQL Editor:
1. `db/migrations/001_fixes.sql`: Configures the `embedding vector(384)` columns, adds table constraints (`chk_contract_status`, `chk_contract_dates`), default roles (`ADMIN`, `REVIEWER`), and creates HNSW cosine indexes (`vector_cosine_ops`).
2. `db/migrations/002_audit_trigger.sql`: Creates the `log_contract_status_change()` trigger function and attaches `trg_contract_status_audit` AFTER UPDATE ON `contract`.
3. `db/migrations/003_milestone_date_trigger.sql`: Creates `check_milestone_date_range()` trigger function and attaches `trg_check_milestone_date` BEFORE INSERT/UPDATE ON `milestone`.
4. `db/migrations/004_contract_summary_function.sql`: Defines stored function `get_contract_summary(p_contract_id)` returning milestone aggregates as a relational table.
5. `db/migrations/005_similarity_function.sql`: Defines stored function `find_similar_standard_clauses(...)` performing ranked cosine distance queries against `standard_clause`.

### 3. Seed Files (`db/`)
Populate initial test data by executing these scripts in the Supabase SQL Editor:
1. `db/seed.sql`: Populates baseline vendor organizations (`Acme Supplies Pvt Ltd`, `Globex Logistics`) and sample contracts.
2. `db/seed_milestones.sql`: Seeds delivery milestones and payment schedules.
3. `db/seed_approval_steps.sql`: Configures the dual approval steps for Contract 1 and sets status to `PENDING_APPROVAL`.

### 4. Seed Standard Legal Clauses
Generate 384-dimensional dense vector embeddings for benchmark legal clauses from `data/standard_clauses.json` and insert them into the `standard_clause` table:

```bash
node --env-file=.env.local scripts/seed-standard-clauses.mjs
```

---

## User Accounts & Role Management

Authentication uses email and bcrypt-hashed passwords. There is **no passwordless login**.

### Registration
1. Navigate to the registration page at `/login`.
2. Register a new user account with a name, email address, and a secure password.
3. By default, all newly registered accounts are assigned the **`REVIEWER`** role.

### Promoting a User to ADMIN
To promote a user to `ADMIN`, execute the following SQL query in your database:

```sql
UPDATE app_user 
SET role_id = (SELECT role_id FROM role WHERE role_name = 'ADMIN') 
WHERE email = 'your-user-email@example.com';
```

After updating the role in the database, the user must **log out and log in again** so that the JWT session cookie refreshes with the updated `ADMIN` privileges.

---

## Running the Application

Start the local Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

To create an optimized production build:

```bash
npm run build
npm run start
```

---

## Documentation

Comprehensive project documentation is maintained in the [`docs/`](docs/) directory:

- [`docs/data-dictionary.md`](docs/data-dictionary.md): Full data dictionary detailing all 10 tables, views, data types, constraints, default values, foreign keys, and vector indexes.
- [`docs/architecture.md`](docs/architecture.md): High-level system architecture, data flow diagrams, and component interactions.
- [`docs/important-queries.md`](docs/important-queries.md): Key SQL queries demonstrating aggregations, correlated subqueries, CTEs, views, and DML transaction flows.
- [`docs/migrations-order.md`](docs/migrations-order.md): Detailed migration sequence, database setup instructions, and seeding guidelines.
- [`docs/db-corrections.md`](docs/db-corrections.md): Chronological record of database schema fixes, index configurations, and constraint definitions.
- [`docs/test-cases.md`](docs/test-cases.md): Functional and architectural verification test cases covering CRUD, RBAC, trigger rejections, and vector similarity.
