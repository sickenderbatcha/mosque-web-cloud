-- Drop and recreate the family_relationship enum with new values
ALTER TYPE family_relationship RENAME TO family_relationship_old;

CREATE TYPE family_relationship AS ENUM ('கணவன்', 'மனைவி', 'மகன்', 'மகள்');

-- Update the column to use the new enum
ALTER TABLE gb_family_members 
  ALTER COLUMN relationship TYPE family_relationship 
  USING (
    CASE relationship::text
      WHEN 'Spouse' THEN 'கணவன்'::family_relationship
      WHEN 'Child' THEN 'மகன்'::family_relationship
      WHEN 'Parent' THEN 'கணவன்'::family_relationship
      WHEN 'Sibling' THEN 'மகன்'::family_relationship
      ELSE 'மகன்'::family_relationship
    END
  );

-- Drop the old enum
DROP TYPE family_relationship_old;