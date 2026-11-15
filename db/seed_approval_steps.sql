-- Seed approval steps for Contract 1
-- Idempotent: ensures Contract 1 is in PENDING_APPROVAL with steps for Admin (Aakash) and Reviewer (Krish)

-- 1. Ensure Contract 1 is PENDING_APPROVAL
UPDATE contract 
SET status = 'PENDING_APPROVAL' 
WHERE contract_id = (SELECT contract_id FROM contract ORDER BY contract_id ASC LIMIT 1);

-- 2. Reset status of existing approval steps to PENDING if re-run
UPDATE approval_step
SET status = 'PENDING', acted_at = NULL
WHERE contract_id = (SELECT contract_id FROM contract ORDER BY contract_id ASC LIMIT 1)
  AND approver_id IN (
    SELECT user_id FROM app_user WHERE email IN ('aakashagarwal126@gmail.com', 'krishg@gmail.com')
  );

-- 3. Insert approval steps if not already present
INSERT INTO approval_step (contract_id, approver_id, status, acted_at)
SELECT 
  (SELECT contract_id FROM contract ORDER BY contract_id ASC LIMIT 1),
  u.user_id,
  'PENDING',
  NULL
FROM app_user u
WHERE u.email IN ('aakashagarwal126@gmail.com', 'krishg@gmail.com')
  AND u.user_id NOT IN (
    SELECT approver_id FROM approval_step 
    WHERE contract_id = (SELECT contract_id FROM contract ORDER BY contract_id ASC LIMIT 1)
  );
