-- Phase 16: denormalised company name on jobs.
-- For company-type customers, the quote should display the company name
-- prominently with the contact person as a sub-line. Storing it on the
-- jobs row avoids a customers JOIN at every render site and keeps quotes
-- correct even if the customer record is later renamed.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_company_name TEXT;

COMMENT ON COLUMN jobs.customer_company_name IS
  'Company / business name when the customer is a company. NULL for individual customers. Display: primary line on the quote; customer_name shown as the contact-person subtitle.';
