-- 1. Contracts per status
SELECT status, COUNT(*)::INT as count
FROM contract
GROUP BY status;

-- 2. Vendors with contract count, using HAVING and ORDER BY
SELECT v.name, COUNT(c.contract_id)::INT as contract_count
FROM vendor v
LEFT JOIN contract c ON v.vendor_id = c.vendor_id
GROUP BY v.vendor_id, v.name
HAVING COUNT(c.contract_id) > 0
ORDER BY contract_count DESC;

-- 3. Contracts whose milestone total is above the average
WITH contract_totals AS (
    SELECT contract_id, SUM(amount) as total_amount
    FROM milestone
    GROUP BY contract_id
)
SELECT c.title, ct.total_amount
FROM contract c
JOIN contract_totals ct ON c.contract_id = ct.contract_id
WHERE ct.total_amount > (SELECT AVG(total_amount) FROM contract_totals);

-- 4. Flagged contracts (from view)
SELECT * FROM v_pending_contract_reviews;

-- 5. Total Vendors (All vendors)
SELECT COUNT(*)::INT as total_vendors
FROM vendor;
