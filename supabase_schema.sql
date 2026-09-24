-- ==============================================================================
-- zebMalik.tech Blog & Revenue-Share Platform — Database Schema
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Author Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  payout_method TEXT DEFAULT 'wise' CHECK (payout_method IN ('wise', 'payoneer', 'bank', 'paypal')),
  payout_details TEXT DEFAULT '',
  total_earned NUMERIC(10,2) DEFAULT 0.00,
  current_balance NUMERIC(10,2) DEFAULT 0.00,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content_markdown TEXT NOT NULL,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
  rejection_reason TEXT,
  view_count BIGINT DEFAULT 0,
  estimated_earnings NUMERIC(10,2) DEFAULT 0.00,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Post Views (Anti-bot unique daily view ledger)
CREATE TABLE IF NOT EXISTS public.post_views (
  id BIGSERIAL PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  ip_hash TEXT NOT NULL,
  viewed_at DATE DEFAULT CURRENT_DATE,
  CONSTRAINT unique_daily_view UNIQUE (post_id, ip_hash, viewed_at)
);

-- 5. Payout Requests Table
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 20.00),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'declined')),
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view public author profiles
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT USING (true);

-- Profiles: Users can edit only their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Profiles: Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    LOWER(REGEXP_REPLACE(split_part(new.email, '@', 1) || '_' || SUBSTRING(new.id::text, 1, 4), '[^a-zA-Z0-9_]', '', 'g'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Posts: Anyone can read published posts
CREATE POLICY "Published posts are public" ON public.posts
  FOR SELECT USING (status = 'published');

-- Posts: Authors can view all their own posts (even drafts & pending)
CREATE POLICY "Authors can view own posts" ON public.posts
  FOR SELECT USING (auth.uid() = author_id);

-- Posts: Authors can create drafts
CREATE POLICY "Authors can insert own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Posts: Authors can update own drafts or pending posts (not published)
CREATE POLICY "Authors can update own drafts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id AND status IN ('draft', 'pending', 'rejected'));

-- ==============================================================================
-- Stored Procedures: Record Verified View & Credit Author Earnings (40% Rev-Share)
-- Baseline RPM: $2.50 per 1,000 views => Author cut (40%) = $1.00 per 1,000 views ($0.001 per view)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_verified_view(target_post_id UUID, client_ip_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN := FALSE;
  post_author_id UUID;
  author_rate_per_view NUMERIC := 0.001; -- $1.00 per 1,000 views
BEGIN
  -- Insert into post_views ledger (unique daily view)
  INSERT INTO public.post_views (post_id, ip_hash, viewed_at)
  VALUES (target_post_id, client_ip_hash, CURRENT_DATE)
  ON CONFLICT (post_id, ip_hash, viewed_at) DO NOTHING;

  IF FOUND THEN
    -- Increment post view_count and post estimated_earnings
    UPDATE public.posts
    SET view_count = view_count + 1,
        estimated_earnings = estimated_earnings + author_rate_per_view
    WHERE id = target_post_id
    RETURNING author_id INTO post_author_id;

    -- Credit the author's current_balance and total_earned
    IF post_author_id IS NOT NULL THEN
      UPDATE public.profiles
      SET current_balance = current_balance + author_rate_per_view,
          total_earned = total_earned + author_rate_per_view
      WHERE id = post_author_id;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
