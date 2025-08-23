import { useState, useEffect, useMemo } from 'react';
import { addDays, format, startOfDay, addHours } from 'date-fns';

interface DemoRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  photo_url?: string;
  status: 'available' | 'busy' | 'upcoming';
}

interface DemoBooking {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room_id: string;
  user_id: string;
  organization_id: string;
  attendees?: number;
  description?: string;
  user_profiles?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface DemoWelcomeSettings {
  welcome_text: string;
  sub_text: string;
  background_type: string;
  background_value: string;
  text_color: string;
  wifi_enabled: boolean;
  wifi_ssid?: string;
  animation_enabled: boolean;
  animation_type: string;
}

const INITIAL_ROOMS: DemoRoom[] = [
  {
    id: 'demo-room-1',
    name: 'Boardroom',
    capacity: 12,
    location: 'Floor 3, East Wing',
    amenities: ['projector', 'whiteboard', 'conference-phone', 'coffee'],
    status: 'available'
  },
  {
    id: 'demo-room-2',
    name: 'Huddle Room',
    capacity: 4,
    location: 'Floor 2, West Wing',
    amenities: ['monitor', 'whiteboard'],
    status: 'available'
  },
  {
    id: 'demo-room-3',
    name: 'Training Room',
    capacity: 20,
    location: 'Floor 1, Main Building',
    amenities: ['projector', 'sound-system', 'whiteboard', 'flip-chart'],
    status: 'available'
  }
];

const generateInitialBookings = (): DemoBooking[] => {
  const today = new Date();
  const bookings: DemoBooking[] = [];
  
  // Generate bookings for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Add some random bookings for each day
    const numBookings = Math.floor(Math.random() * 4) + 1; // 1-4 bookings per day
    
    for (let i = 0; i < numBookings; i++) {
      const startHour = 9 + Math.floor(Math.random() * 8); // 9 AM to 4 PM
      const duration = [1, 2, 3][Math.floor(Math.random() * 3)]; // 1-3 hours
      const roomId = INITIAL_ROOMS[Math.floor(Math.random() * INITIAL_ROOMS.length)].id;
      
      const startTime = addHours(startOfDay(date), startHour);
      const endTime = addHours(startTime, duration);
      
      bookings.push({
        id: `demo-booking-${dayOffset}-${i}`,
        title: ['Team Standup', 'Client Meeting', 'Project Review', 'Training Session'][Math.floor(Math.random() * 4)],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        room_id: roomId,
        user_id: 'demo-user',
        organization_id: 'demo-org',
        attendees: Math.floor(Math.random() * 8) + 2,
        user_profiles: {
          email: 'demo@example.com',
          display_name: ['Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emma Davis'][Math.floor(Math.random() * 4)],
          avatar_url: undefined
        }
      });
    }
  }
  
  return bookings;
};

const DEMO_WELCOME_SETTINGS: DemoWelcomeSettings = {
  welcome_text: 'Welcome to EasyRoom!',
  sub_text: 'Your meeting spaces await',
  background_type: 'gradient',
  background_value: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))',
  text_color: '#FFFFFF',
  wifi_enabled: true,
  wifi_ssid: 'Demo-WiFi',
  animation_enabled: true,
  animation_type: 'floating'
};

export function useDemoData() {
  const [rooms] = useState<DemoRoom[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [welcomeSettings] = useState<DemoWelcomeSettings>(DEMO_WELCOME_SETTINGS);

  // Initialize bookings on mount
  useEffect(() => {
    setBookings(generateInitialBookings());
  }, []);

  // Auto-reset demo data every 30 minutes
  useEffect(() => {
    const resetInterval = setInterval(() => {
      console.log('🔄 Resetting demo data...');
      setBookings(generateInitialBookings());
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(resetInterval);
  }, []);

  const createBooking = (bookingData: Partial<DemoBooking>) => {
    const newBooking: DemoBooking = {
      id: `demo-booking-${Date.now()}`,
      title: bookingData.title || 'New Meeting',
      start_time: bookingData.start_time || new Date().toISOString(),
      end_time: bookingData.end_time || addHours(new Date(), 1).toISOString(),
      room_id: bookingData.room_id || rooms[0].id,
      user_id: 'demo-user',
      organization_id: 'demo-org',
      attendees: bookingData.attendees || 2,
      description: bookingData.description,
      user_profiles: {
        email: 'demo@example.com',
        display_name: 'Demo User',
        avatar_url: undefined
      }
    };

    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  };

  const updateBooking = (bookingId: string, updates: Partial<DemoBooking>) => {
    setBookings(prev => prev.map(booking => 
      booking.id === bookingId 
        ? { ...booking, ...updates }
        : booking
    ));
  };

  const deleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(booking => booking.id !== bookingId));
  };

  return {
    rooms,
    bookings,
    welcomeSettings,
    createBooking,
    updateBooking,
    deleteBooking
  };
}