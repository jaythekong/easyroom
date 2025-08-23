import React, { createContext, useContext, useState, useEffect } from 'react';
import { addDays, format, startOfDay, addHours } from 'date-fns';

// Mock organization data
const DEMO_ORGANIZATION = {
  id: 'demo-org-id',
  name: 'Acme Corporation',
  slug: 'demo',
  logo_url: '/lovable-uploads/ad910135-1d38-4411-a013-3b7a07aaa500.png',
  primary_color: '#ea580c',
  timezone: 'America/New_York',
  tagline: 'Innovation starts here',
  telegram_cta_enabled: true,
  welcome_message: 'Welcome to Acme Corporation! You\'ve successfully subscribed to our demo booking notifications.',
  status: 'active'
};

// Mock user data
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@acmecorp.com',
  user_metadata: {
    display_name: 'Demo User'
  }
};

// Mock user profile
const DEMO_USER_PROFILE = {
  user_id: 'demo-user-id',
  organization_id: 'demo-org-id',
  display_name: 'Demo User',
  email: 'demo@acmecorp.com',
  role: 'member' as const,
  avatar_url: undefined
};

// Mock rooms data
const DEMO_ROOMS = [
  {
    id: 'demo-room-1',
    name: 'Boardroom Alpha',
    capacity: 12,
    location: 'Floor 3, East Wing',
    description: 'Executive boardroom with premium amenities',
    photo_url: undefined,
    status: 'active' as const,
    organization_id: 'demo-org-id',
    amenities: ['projector', 'whiteboard', 'conference-phone', 'coffee']
  },
  {
    id: 'demo-room-2', 
    name: 'Huddle Space Beta',
    capacity: 6,
    location: 'Floor 2, West Wing',
    description: 'Cozy space for small team meetings',
    photo_url: undefined,
    status: 'active' as const,
    organization_id: 'demo-org-id',
    amenities: ['monitor', 'whiteboard', 'wifi']
  },
  {
    id: 'demo-room-3',
    name: 'Training Center',
    capacity: 20,
    location: 'Floor 1, Main Building', 
    description: 'Large training room with presentation setup',
    photo_url: undefined,
    status: 'active' as const,
    organization_id: 'demo-org-id',
    amenities: ['projector', 'sound-system', 'whiteboard', 'flip-chart']
  }
];

// Generate demo bookings
const generateDemoBookings = () => {
  const today = new Date();
  const bookings = [];
  
  // Generate bookings for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Add some realistic bookings for each day
    const numBookings = Math.floor(Math.random() * 4) + 2; // 2-5 bookings per day
    
    for (let i = 0; i < numBookings; i++) {
      const startHour = 9 + Math.floor(Math.random() * 8); // 9 AM to 4 PM
      const duration = [1, 2, 3][Math.floor(Math.random() * 3)]; // 1-3 hours
      const roomId = DEMO_ROOMS[Math.floor(Math.random() * DEMO_ROOMS.length)].id;
      
      const startTime = addHours(startOfDay(date), startHour);
      const endTime = addHours(startTime, duration);
      
      const names = ['Alex Johnson', 'Sarah Chen', 'Mike Rodriguez', 'Emma Davis', 'John Smith', 'Lisa Wang'];
      const titles = ['Team Standup', 'Client Meeting', 'Project Review', 'Training Session', 'Board Meeting', 'Design Review'];
      
      bookings.push({
        id: `demo-booking-${dayOffset}-${i}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        room_id: roomId,
        user_id: 'demo-user-id',
        organization_id: 'demo-org-id',
        attendees: Math.floor(Math.random() * 8) + 2,
        description: 'Demo booking - this is sample data for demonstration purposes',
        status: 'confirmed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_profiles: {
          user_id: 'demo-user-id',
          email: 'demo@acmecorp.com',
          display_name: names[Math.floor(Math.random() * names.length)],
          avatar_url: undefined
        }
      });
    }
  }
  
  return bookings;
};

interface DemoContextType {
  isDemoMode: boolean;
  organization: typeof DEMO_ORGANIZATION;
  user: typeof DEMO_USER;
  userProfile: typeof DEMO_USER_PROFILE;
  userRole: 'member';
  rooms: typeof DEMO_ROOMS;
  bookings: any[];
  createBooking: (bookingData: any) => void;
  updateBooking: (bookingId: string, updates: any) => void;
  deleteBooking: (bookingId: string) => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<any[]>([]);

  // Initialize demo bookings
  useEffect(() => {
    setBookings(generateDemoBookings());
  }, []);

  // Auto-reset demo data every 30 minutes
  useEffect(() => {
    const resetInterval = setInterval(() => {
      console.log('🔄 Resetting demo data...');
      setBookings(generateDemoBookings());
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(resetInterval);
  }, []);

  const createBooking = (bookingData: any) => {
    const newBooking = {
      id: `demo-booking-${Date.now()}`,
      title: bookingData.title || 'New Demo Meeting',
      start_time: bookingData.start_time || new Date().toISOString(),
      end_time: bookingData.end_time || addHours(new Date(), 1).toISOString(),
      room_id: bookingData.room_id,
      user_id: 'demo-user-id',
      organization_id: 'demo-org-id',
      attendees: bookingData.attendees || 2,
      description: bookingData.description || 'Demo booking',
      status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_profiles: {
        user_id: 'demo-user-id',
        email: 'demo@acmecorp.com',
        display_name: 'Demo User',
        avatar_url: undefined
      }
    };

    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  };

  const updateBooking = (bookingId: string, updates: any) => {
    setBookings(prev => prev.map(booking => 
      booking.id === bookingId 
        ? { ...booking, ...updates, updated_at: new Date().toISOString() }
        : booking
    ));
  };

  const deleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(booking => booking.id !== bookingId));
  };

  const value: DemoContextType = {
    isDemoMode: true,
    organization: DEMO_ORGANIZATION,
    user: DEMO_USER,
    userProfile: DEMO_USER_PROFILE,
    userRole: 'member',
    rooms: DEMO_ROOMS,
    bookings,
    createBooking,
    updateBooking,
    deleteBooking
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
}