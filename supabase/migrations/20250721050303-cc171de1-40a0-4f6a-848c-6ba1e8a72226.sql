-- Create enum for room status
CREATE TYPE public.room_status AS ENUM ('active', 'inactive');

-- Create amenities table
CREATE TABLE public.amenities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER NOT NULL,
  description TEXT,
  photo_url TEXT,
  status room_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for room amenities
CREATE TABLE public.room_amenities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, amenity_id)
);

-- Enable Row Level Security
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_amenities ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (rooms and amenities need to be visible to all users)
CREATE POLICY "Anyone can view amenities" 
ON public.amenities 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view active rooms" 
ON public.rooms 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Anyone can view room amenities" 
ON public.room_amenities 
FOR SELECT 
USING (true);

-- Admin policies (for now, we'll allow authenticated users to manage - will refine with roles later)
CREATE POLICY "Authenticated users can manage amenities" 
ON public.amenities 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage rooms" 
ON public.rooms 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage room amenities" 
ON public.room_amenities 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_amenities_updated_at
  BEFORE UPDATE ON public.amenities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default amenities
INSERT INTO public.amenities (name, description) VALUES
  ('Projector', 'Digital projector for presentations'),
  ('Whiteboard', 'Wall-mounted whiteboard with markers'),
  ('Video Conferencing', 'Built-in video conferencing system'),
  ('Conference Phone', 'Dedicated conference phone system'),
  ('TV Screen', 'Large TV screen for presentations'),
  ('Flipchart', 'Portable flipchart with paper'),
  ('Microphone', 'Wireless microphone system'),
  ('Kitchen Access', 'Adjacent to kitchen facilities');

-- Insert some sample rooms
INSERT INTO public.rooms (name, location, capacity, description, status) VALUES
  ('The Boardroom', 'Building A, 3rd Floor', 12, 'Executive boardroom with city view', 'active'),
  ('Innovation Hub', 'Building A, 2nd Floor', 8, 'Creative meeting space with modern furniture', 'active'),
  ('Room 3B', 'Building B, 3rd Floor', 6, 'Standard meeting room', 'active'),
  ('The Fishbowl', 'Building A, 1st Floor', 4, 'Glass-walled room perfect for brainstorming', 'active');