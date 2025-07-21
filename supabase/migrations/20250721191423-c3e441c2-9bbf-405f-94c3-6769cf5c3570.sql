-- Delete duplicate bookings, keeping only the earliest created one for each unique booking
WITH duplicate_bookings AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, start_time, end_time, room_id, user_id 
      ORDER BY created_at ASC
    ) as row_num
  FROM bookings 
  WHERE organization_id = 'cf47d6a7-e2f6-4ba4-b0f4-4ff65ffc5277'
)
DELETE FROM bookings 
WHERE id IN (
  SELECT id FROM duplicate_bookings WHERE row_num > 1
);