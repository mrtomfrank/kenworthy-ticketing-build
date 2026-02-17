
-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('regular_user', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'regular_user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  rating TEXT DEFAULT 'NR',
  genre TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create showings table
CREATE TABLE public.showings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  ticket_price NUMERIC(10,2) NOT NULL DEFAULT 8.00,
  total_seats INTEGER NOT NULL DEFAULT 200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create seats table (represents the theatre layout)
CREATE TABLE public.seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seat_row TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  seat_type TEXT NOT NULL DEFAULT 'standard',
  UNIQUE(seat_row, seat_number)
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  showing_id UUID NOT NULL REFERENCES public.showings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.06,
  tax_amount NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(showing_id, seat_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_showings_updated_at BEFORE UPDATE ON public.showings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROFILES RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- MOVIES RLS (public read, admin write)
CREATE POLICY "Anyone can view active movies" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Admins can insert movies" ON public.movies FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update movies" ON public.movies FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete movies" ON public.movies FOR DELETE USING (public.is_admin());

-- SHOWINGS RLS (public read, admin write)
CREATE POLICY "Anyone can view active showings" ON public.showings FOR SELECT USING (true);
CREATE POLICY "Admins can insert showings" ON public.showings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update showings" ON public.showings FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete showings" ON public.showings FOR DELETE USING (public.is_admin());

-- SEATS RLS (public read)
CREATE POLICY "Anyone can view seats" ON public.seats FOR SELECT USING (true);

-- TICKETS RLS
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can purchase tickets" ON public.tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can delete tickets" ON public.tickets FOR DELETE USING (public.is_admin());

-- Seed the theatre seats (Kenworthy has ~200 seats)
-- Rows A-J, seats 1-20
INSERT INTO public.seats (seat_row, seat_number) 
SELECT row_letter, seat_num 
FROM (VALUES ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H'),('I'),('J')) AS rows(row_letter),
     generate_series(1, 20) AS seat_num;
