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