-- Drop and recreate the marital_status enum with Tamil values
ALTER TYPE marital_status RENAME TO marital_status_old;

CREATE TYPE marital_status AS ENUM ('திருமணமாகாதவர்', 'திருமணமானவர்', 'விவாகரத்தானவர்', 'விதவை/விதுரர்');

-- Update the column to use the new enum
ALTER TABLE gb_family_members 
  ALTER COLUMN marital_status TYPE marital_status 
  USING (
    CASE marital_status::text
      WHEN 'Single' THEN 'திருமணமாகாதவர்'::marital_status
      WHEN 'Married' THEN 'திருமணமானவர்'::marital_status
      WHEN 'Divorced' THEN 'விவாகரத்தானவர்'::marital_status
      WHEN 'Widowed' THEN 'விதவை/விதுரர்'::marital_status
      ELSE NULL
    END
  );

-- Drop the old enum
DROP TYPE marital_status_old;