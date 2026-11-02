CREATE OR REPLACE FUNCTION get_contract_summary(p_contract_id INT)
RETURNS TABLE (
  total_milestones INT,
  completed_milestones INT,
  total_value NUMERIC,
  completed_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT AS total_milestones,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::INT AS completed_milestones,
    COALESCE(SUM(amount), 0.00) AS total_value,
    COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0.00) AS completed_value
  FROM milestone
  WHERE contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql;