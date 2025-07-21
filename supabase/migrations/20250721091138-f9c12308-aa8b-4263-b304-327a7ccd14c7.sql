
-- Create a bookings table to store meeting room reservations
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  attendees INTEGER,
  recurring TEXT DEFAULT 'none',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL,
  
  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Add foreign key constraints
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_bookings_room_time ON public.bookings (room_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON public.bookings (user_id);
CREATE INDEX idx_bookings_organization ON public.bookings (organization_id);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view bookings in their organization"
  ON public.bookings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create bookings in their organization"
  ON public.bookings
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own bookings"
  ON public.bookings
  FOR UPDATE
  USING (user_id = auth.uid() AND organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their own bookings"
  ON public.bookings
  FOR DELETE
  USING (user_id = auth.uid() AND organization_id = get_user_organization_id());

-- Add trigger for updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
