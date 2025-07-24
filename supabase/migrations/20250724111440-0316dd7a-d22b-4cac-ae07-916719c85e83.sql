-- Fix search path security warning for get_room_gaps function
CREATE OR REPLACE FUNCTION public.get_room_gaps(
  p_room_id uuid,
  p_date date,
  p_open time DEFAULT '08:00',
  p_close time DEFAULT '22:00'
)
RETURNS TABLE(gap_start timestamptz, gap_end timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
WITH hours AS (
  SELECT
    make_timestamptz(
      extract(year from p_date)::int,
      extract(month from p_date)::int,
      extract(day from p_date)::int,
      extract(hour from p_open)::int,
      extract(minute from p_open)::int, 
      0, 'UTC'
    ) as open_ts,
    make_timestamptz(
      extract(year from p_date)::int,
      extract(month from p_date)::int,
      extract(day from p_date)::int,
      extract(hour from p_close)::int,
      extract(minute from p_close)::int, 
      0, 'UTC'
    ) as close_ts
),
blocks AS (
  -- Get all confirmed bookings for this room on this date
  SELECT start_time, end_time
  FROM public.bookings
  WHERE room_id = p_room_id
    AND start_time::date = p_date
    AND status = 'confirmed'
  
  UNION ALL
  -- Add office hours boundaries as fake bookings to clip the ends
  SELECT open_ts, open_ts FROM hours
  UNION ALL
  SELECT close_ts, close_ts FROM hours
),
ordered AS (
  SELECT start_time, end_time,
         LAG(end_time) OVER (ORDER BY start_time) as prev_end
  FROM blocks
  ORDER BY start_time
)
SELECT prev_end as gap_start, start_time as gap_end
FROM ordered
WHERE prev_end IS NOT NULL
  AND start_time > prev_end;
$$;