-- Fix status column whitespace issues in hotel_chains and hotel_brands tables
-- Removes carriage return (\r) and newline (\n) characters from status values

-- Update hotel_chains
UPDATE hotel_chains
SET status = TRIM(BOTH FROM REPLACE(REPLACE(status, CHR(13), ''), CHR(10), ''))
WHERE status LIKE '%' || CHR(13) || '%' 
   OR status LIKE '%' || CHR(10) || '%'
   OR status <> TRIM(status);

-- Update hotel_brands
UPDATE hotel_brands
SET status = TRIM(BOTH FROM REPLACE(REPLACE(status, CHR(13), ''), CHR(10), ''))
WHERE status LIKE '%' || CHR(13) || '%' 
   OR status LIKE '%' || CHR(10) || '%'
   OR status <> TRIM(status);

-- Verify results
SELECT 'hotel_chains' as table_name, status, LENGTH(status) as length, COUNT(*) as count
FROM hotel_chains
GROUP BY status
ORDER BY status;

SELECT 'hotel_brands' as table_name, status, LENGTH(status) as length, COUNT(*) as count
FROM hotel_brands
GROUP BY status
ORDER BY status;

