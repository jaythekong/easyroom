-- Create function to calculate available time gaps for a room on a specific date
CREATE OR REPLACE FUNCTION get_room_gaps(p_room_id UUID, p_date DATE)
RETURNS TABLE(gap_start TIMESTAMPTZ, gap_end TIMESTAMPTZ) AS $$
DECLARE
    day_start TIMESTAMPTZ;
    day_end TIMESTAMPTZ;
    prev_end TIMESTAMPTZ;
    rec RECORD;
BEGIN
    -- Set the business hours (8 AM to 10 PM)
    day_start := p_date::TIMESTAMPTZ + INTERVAL '8 hours';
    day_end := p_date::TIMESTAMPTZ + INTERVAL '22 hours';
    
    -- Initialize previous end time to start of business hours
    prev_end := day_start;
    
    -- Get all bookings and downtime for the room on the specified date, ordered by start time
    FOR rec IN (
        SELECT start_time, end_time
        FROM (
            -- Get bookings
            SELECT start_time, end_time
            FROM bookings
            WHERE room_id = p_room_id 
            AND DATE(start_time AT TIME ZONE 'UTC') = p_date
            AND status = 'confirmed'
            
            UNION ALL
            
            -- Get downtime
            SELECT start_time, end_time
            FROM room_downtime
            WHERE room_id = p_room_id
            AND DATE(start_time AT TIME ZONE 'UTC') = p_date
        ) AS combined_events
        ORDER BY start_time
    ) LOOP
        -- If there's a gap between previous end and current start, return it
        IF prev_end < rec.start_time THEN
            gap_start := prev_end;
            gap_end := rec.start_time;
            RETURN NEXT;
        END IF;
        
        -- Update previous end time (handle overlapping bookings)
        IF rec.end_time > prev_end THEN
            prev_end := rec.end_time;
        END IF;
    END LOOP;
    
    -- If there's time left after the last booking until end of business hours
    IF prev_end < day_end THEN
        gap_start := prev_end;
        gap_end := day_end;
        RETURN NEXT;
    END IF;
    
    -- If no bookings at all, return the entire business day as a gap
    IF NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = p_room_id 
        AND DATE(start_time AT TIME ZONE 'UTC') = p_date
        AND status = 'confirmed'
        
        UNION ALL
        
        SELECT 1 FROM room_downtime
        WHERE room_id = p_room_id
        AND DATE(start_time AT TIME ZONE 'UTC') = p_date
    ) THEN
        gap_start := day_start;
        gap_end := day_end;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;