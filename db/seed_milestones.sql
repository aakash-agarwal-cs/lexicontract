INSERT INTO milestone (contract_id, description, due_date, amount, status)
VALUES 
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Master Services Agreement%' OR title LIKE '%MSA%' LIMIT 1),
    'Initial Architecture Design & Review',
    '2026-03-15',
    15000.00,
    'COMPLETED'
  ),
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Master Services Agreement%' OR title LIKE '%MSA%' LIMIT 1),
    'Alpha Release and Core Backend Implementation',
    '2026-05-01',
    25000.00,
    'PENDING'
  ),
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Master Services Agreement%' OR title LIKE '%MSA%' LIMIT 1),
    'Beta Testing and Security Audit',
    '2026-07-15',
    10000.00,
    'PENDING'
  ),
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Non-Disclosure%' OR title LIKE '%NDA%' LIMIT 1),
    'Legal Documentation Handover',
    '2026-02-10',
    5000.00,
    'COMPLETED'
  ),
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Non-Disclosure%' OR title LIKE '%NDA%' LIMIT 1),
    'Compliance Verification Phase 1',
    '2026-04-01',
    7500.00,
    'PENDING'
  ),
  (
    (SELECT contract_id FROM contract WHERE title LIKE '%Non-Disclosure%' OR title LIKE '%NDA%' LIMIT 1),
    'Final Compliance Sign-off',
    '2026-06-01',
    7500.00,
    'PENDING'
  );