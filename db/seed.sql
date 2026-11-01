INSERT INTO vendor (name, registration_number, contact_email, contact_phone) VALUES
  ('Acme Supplies Pvt Ltd', 'REG-1001', 'contact@acme.example', '9000000001'),
  ('Globex Logistics', 'REG-1002', 'hello@globex.example', '9000000002')
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO contract (vendor_id, created_by, title, contract_type, status, start_date, end_date)
SELECT v.vendor_id,
       (SELECT user_id FROM app_user ORDER BY user_id LIMIT 1),
       'Acme Master Services Agreement', 'MSA', 'PENDING_APPROVAL', '2026-01-01', '2027-01-01'
FROM vendor v WHERE v.name = 'Acme Supplies Pvt Ltd';

INSERT INTO contract (vendor_id, created_by, title, contract_type, status, start_date, end_date)
SELECT v.vendor_id,
       (SELECT user_id FROM app_user ORDER BY user_id LIMIT 1),
       'Globex Delivery SOW', 'SOW', 'DRAFT', '2026-03-01', '2026-12-31'
FROM vendor v WHERE v.name = 'Globex Logistics';