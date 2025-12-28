-- Supabase Database Schema for Business Finance Management App
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'partner', 'viewer');
CREATE TYPE entry_type AS ENUM ('cash_in', 'cash_out');
CREATE TYPE entity_type AS ENUM ('business', 'book', 'entry');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
CREATE TABLE public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business members table (for role-based access)
CREATE TABLE public.business_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- Books table (financial books within businesses)
CREATE TABLE public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  total_cash_in DECIMAL(15,2) DEFAULT 0,
  total_cash_out DECIMAL(15,2) DEFAULT 0,
  net_balance DECIMAL(15,2) DEFAULT 0,
  settings JSONB DEFAULT '{"showPaymentMode": true, "showCategory": true, "showAttachments": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book entries table (individual transactions)
CREATE TABLE public.book_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type entry_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  payment_mode TEXT,
  category TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table (audit trail)
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX idx_books_business_id ON public.books(business_id);
CREATE INDEX idx_book_entries_book_id ON public.book_entries(book_id);
CREATE INDEX idx_book_entries_date ON public.book_entries(date);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Row Level Security Policies

-- Profiles policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses policies
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view businesses they belong to" ON public.businesses
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Only owners can update businesses" ON public.businesses
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create businesses" ON public.businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only owners can delete businesses" ON public.businesses
  FOR DELETE USING (owner_id = auth.uid());

-- Business members policies
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view business members of their businesses" ON public.business_members
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses 
      WHERE owner_id = auth.uid() OR 
      id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Only owners can manage business members" ON public.business_members
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Books policies
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view books of their businesses" ON public.books
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.businesses 
      WHERE owner_id = auth.uid() OR 
      id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Owners and partners can manage books" ON public.books
  FOR ALL USING (
    business_id IN (
      SELECT id FROM public.businesses 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT business_id FROM public.business_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'partner')
      )
    )
  );

-- Book entries policies
ALTER TABLE public.book_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entries of accessible books" ON public.book_entries
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM public.books 
      WHERE business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid() OR 
        id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Owners and partners can manage entries" ON public.book_entries
  FOR ALL USING (
    book_id IN (
      SELECT id FROM public.books 
      WHERE business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid() OR 
        id IN (
          SELECT business_id FROM public.business_members 
          WHERE user_id = auth.uid() AND role IN ('owner', 'partner')
        )
      )
    )
  );

-- Activity logs policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs of their businesses" ON public.activity_logs
  FOR SELECT USING (
    entity_type = 'business' AND entity_id IN (
      SELECT id FROM public.businesses 
      WHERE owner_id = auth.uid() OR 
      id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    ) OR
    entity_type = 'book' AND entity_id IN (
      SELECT id FROM public.books 
      WHERE business_id IN (
        SELECT id FROM public.businesses 
        WHERE owner_id = auth.uid() OR 
        id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
      )
    )
  );

-- Functions to update totals when entries are added/updated/deleted
CREATE OR REPLACE FUNCTION update_book_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.books 
    SET 
      total_cash_in = COALESCE((
        SELECT SUM(amount) FROM public.book_entries 
        WHERE book_id = OLD.book_id AND type = 'cash_in'
      ), 0),
      total_cash_out = COALESCE((
        SELECT SUM(amount) FROM public.book_entries 
        WHERE book_id = OLD.book_id AND type = 'cash_out'
      ), 0),
      updated_at = NOW()
    WHERE id = OLD.book_id;
    
    UPDATE public.books 
    SET net_balance = total_cash_in - total_cash_out
    WHERE id = OLD.book_id;
    
    RETURN OLD;
  ELSE
    UPDATE public.books 
    SET 
      total_cash_in = COALESCE((
        SELECT SUM(amount) FROM public.book_entries 
        WHERE book_id = NEW.book_id AND type = 'cash_in'
      ), 0),
      total_cash_out = COALESCE((
        SELECT SUM(amount) FROM public.book_entries 
        WHERE book_id = NEW.book_id AND type = 'cash_out'
      ), 0),
      updated_at = NOW()
    WHERE id = NEW.book_id;
    
    UPDATE public.books 
    SET net_balance = total_cash_in - total_cash_out
    WHERE id = NEW.book_id;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_book_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.book_entries
  FOR EACH ROW EXECUTE FUNCTION update_book_totals();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically add business owner as member
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add owner as member when business is created
CREATE TRIGGER on_business_created
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();