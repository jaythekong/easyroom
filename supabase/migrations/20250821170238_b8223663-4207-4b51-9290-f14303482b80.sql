-- First, let's add sample bookings for kjil organization
-- Get the kjil org ID and demo user ID, and room IDs
DO $$
DECLARE
    kjil_org_id UUID;
    demo_user_id UUID;
    room_ids UUID[] := ARRAY[]::UUID[];
    room_id UUID;
    booking_date DATE;
    booking_hour INTEGER;
BEGIN
    -- Get kjil organization ID
    SELECT id INTO kjil_org_id FROM organizations WHERE slug = 'kjil';
    
    -- Get demo user ID
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'soliyak@gmail.com';
    
    -- Get room IDs for kjil
    SELECT ARRAY_AGG(id) INTO room_ids FROM rooms WHERE organization_id = kjil_org_id;
    
    -- Only proceed if we have the necessary data
    IF kjil_org_id IS NOT NULL AND demo_user_id IS NOT NULL AND array_length(room_ids, 1) > 0 THEN
        
        -- Update existing rooms with better data
        UPDATE rooms SET 
            name = CASE 
                WHEN name = 'Board Room' THEN 
                    CASE position(id::text in array_to_string(room_ids, ','))
                        WHEN 1 THEN 'Innovation Lab'
                        WHEN 2 THEN 'Executive Conference Room' 
                        ELSE 'Quiet Focus Pod'
                    END
                ELSE name
            END,
            description = CASE 
                WHEN name = 'Board Room' THEN 
                    CASE position(id::text in array_to_string(room_ids, ','))
                        WHEN 1 THEN 'Creative brainstorming space with whiteboard walls and flexible seating'
                        WHEN 2 THEN 'Premium boardroom with video conferencing and executive amenities'
                        ELSE 'Quiet space perfect for focused work and small meetings'
                    END
                ELSE description
            END,
            capacity = CASE 
                WHEN name = 'Board Room' THEN 
                    CASE position(id::text in array_to_string(room_ids, ','))
                        WHEN 1 THEN 8
                        WHEN 2 THEN 16
                        ELSE 4
                    END
                ELSE capacity
            END
        WHERE organization_id = kjil_org_id;
        
        -- Add sample bookings for the next 2 weeks
        FOR i IN 1..20 LOOP
            -- Random date in next 2 weeks
            booking_date := CURRENT_DATE + (random() * 14)::integer;
            
            -- Random hour between 9 AM and 5 PM
            booking_hour := 9 + (random() * 8)::integer;
            
            -- Random room
            room_id := room_ids[1 + (random() * (array_length(room_ids, 1) - 1))::integer];
            
            INSERT INTO bookings (
                room_id,
                user_id,
                organization_id,
                title,
                description,
                start_time,
                end_time,
                attendees,
                status
            ) VALUES (
                room_id,
                demo_user_id,
                kjil_org_id,
                CASE (random() * 6)::integer
                    WHEN 0 THEN 'Weekly Team Standup'
                    WHEN 1 THEN 'Client Presentation'
                    WHEN 2 THEN 'Product Planning Session'
                    WHEN 3 THEN 'Design Review'
                    WHEN 4 THEN 'Strategy Meeting'
                    ELSE 'Training Workshop'
                END,
                CASE (random() * 3)::integer
                    WHEN 0 THEN 'Regular team sync to discuss progress and blockers'
                    WHEN 1 THEN 'Important stakeholder meeting with external clients'
                    ELSE 'Internal team collaboration session'
                END,
                booking_date + (booking_hour || ' hours')::interval,
                booking_date + (booking_hour + 1 + (random() * 2)::integer || ' hours')::interval,
                2 + (random() * 6)::integer,
                CASE (random() * 10)::integer
                    WHEN 0 THEN 'cancelled'
                    ELSE 'confirmed'
                END
            );
        END LOOP;
        
        -- Set up welcome screen settings for kjil
        INSERT INTO welcome_screen_settings (
            organization_id,
            welcome_text,
            sub_text,
            background_type,
            background_value,
            text_color,
            sub_text_color,
            font_size,
            sub_text_size,
            animation_enabled,
            animation_type,
            animation_speed,
            text_shadow,
            wifi_enabled,
            wifi_ssid,
            wifi_password,
            wifi_security,
            is_active
        ) VALUES (
            kjil_org_id,
            'Welcome to KJIL',
            'Innovation • Collaboration • Excellence',
            'gradient',
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '#FFFFFF',
            '#E2E8F0',
            'text-6xl',
            'text-2xl',
            true,
            'floating',
            3,
            true,
            true,
            'KJIL-Guest',
            'welcome2024',
            'WPA',
            true
        ) ON CONFLICT (organization_id) DO UPDATE SET
            welcome_text = EXCLUDED.welcome_text,
            sub_text = EXCLUDED.sub_text,
            updated_at = now();
            
        -- Add ticker settings
        INSERT INTO ticker_settings (
            organization_id,
            master_speed,
            message_spacing
        ) VALUES (
            kjil_org_id,
            45,
            10
        ) ON CONFLICT (organization_id) DO UPDATE SET
            master_speed = EXCLUDED.master_speed,
            message_spacing = EXCLUDED.message_spacing;
            
        -- Add sample ticker messages
        INSERT INTO ticker_messages (
            organization_id,
            message,
            emoji,
            background_color,
            text_color,
            is_active,
            order_index,
            frequency
        ) VALUES 
        (kjil_org_id, 'Welcome to our office space! Please maintain a professional environment.', '👋', '#3B82F6', '#FFFFFF', true, 1, 3),
        (kjil_org_id, 'Fire drill scheduled for Friday at 2 PM. Please follow emergency procedures.', '🚨', '#EF4444', '#FFFFFF', true, 2, 1),
        (kjil_org_id, 'Coffee machine in the break room has been upgraded! Enjoy premium blends.', '☕', '#16A34A', '#FFFFFF', true, 3, 2),
        (kjil_org_id, 'Team building event next Thursday at 4 PM in the main conference room.', '🎉', '#8B5CF6', '#FFFFFF', true, 4, 1);
        
    END IF;
END $$;