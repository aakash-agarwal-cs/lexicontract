-- Changes made directly in SQL (not via the app) have no user, so allow NULL
ALTER TABLE audit_log ALTER COLUMN user_id DROP NOT NULL;

-- The function the trigger runs
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

-- Attach it to the contract table
CREATE TRIGGER trg_contract_status_audit
AFTER UPDATE ON contract
FOR EACH ROW EXECUTE FUNCTION log_contract_status_change();