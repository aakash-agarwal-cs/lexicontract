-- 1. These columns hold vectors, not IDs, so rename them
ALTER TABLE clause RENAME COLUMN embedding_id TO embedding;
ALTER TABLE standard_clause RENAME COLUMN embedding_id TO embedding;

-- 2. DB-level validation (the database rejects bad data itself)
ALTER TABLE contract ADD CONSTRAINT chk_contract_status
  CHECK (status IN ('DRAFT','PENDING_APPROVAL','ACTIVE','EXPIRED','TERMINATED'));
ALTER TABLE contract ADD CONSTRAINT chk_contract_dates
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
ALTER TABLE milestone ADD CONSTRAINT chk_milestone_status
  CHECK (status IN ('PENDING','COMPLETED','OVERDUE'));
ALTER TABLE review_queue ADD CONSTRAINT chk_review_status
  CHECK (resolution_status IN ('UNRESOLVED','ACCEPTED','REJECTED'));

-- 3. Indexes that make similarity search fast (cosine distance)
CREATE INDEX idx_clause_embedding ON clause USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_std_clause_embedding ON standard_clause USING hnsw (embedding vector_cosine_ops);

-- 4. The two roles the app needs
INSERT INTO role (role_name) VALUES ('ADMIN'), ('REVIEWER') ON CONFLICT DO NOTHING;