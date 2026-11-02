CREATE OR REPLACE FUNCTION check_milestone_date_range()
RETURNS TRIGGER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT start_date, end_date INTO v_start_date, v_end_date
  FROM contract
  WHERE contract_id = NEW.contract_id;

  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.due_date < v_start_date OR NEW.due_date > v_end_date THEN
    RAISE EXCEPTION 'Milestone due_date (%) must fall within the contract validity period (% to %)',
      NEW.due_date, v_start_date, v_end_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_milestone_date ON milestone;
CREATE TRIGGER trg_check_milestone_date
  BEFORE INSERT OR UPDATE ON milestone
  FOR EACH ROW
  EXECUTE FUNCTION check_milestone_date_range();