# LexiContract Test Cases

| Test ID | Feature | Steps | Expected Result | Actual Result | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | Vendors | Navigate to `/vendors`, fill out Add Vendor form (Admin), click submit | Vendor is created and appears in list | Vendor created and shown in table | Pass |
| TC-02 | Contracts | Navigate to `/contracts`, select vendor, fill contract details, submit | New contract created in DRAFT status | Contract created successfully | Pass |
| TC-03 | Milestones | Open contract details page `/contracts/[id]`, add milestone with date & amount | Milestone added to contract timeline | Milestone created and listed | Pass |
| TC-04 | Milestone Date Trigger | Create a milestone with `due_date` prior to contract `start_date` or after `end_date` | Database trigger rejects insertion with constraint error | Trigger raised exception as expected | Pass |
| TC-05 | Contract Summary Function | Call `SELECT * FROM get_contract_summary(contract_id)` in SQL | Returns JSON object with contract stats & totals | Summary JSON returned correctly | Pass |
| TC-06 | Reports | Navigate to `/reports` | Displays contracts per status, vendor breakdown, above-avg value, flagged contracts, total vendors | All 5 report sections load with real data | Pass |
| TC-07 | Role Restrictions | Log in as reviewer (`krishg@gmail.com`), check `/vendors` and `/contracts` | Add Vendor/Contract forms and delete buttons are hidden | Forms and action buttons hidden for Reviewer | Pass |

## Aakash's tests
*(Reserved for Aakash)*
