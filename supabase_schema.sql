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
  tax_verified BOOLEAN DEFAULT FALSE, -- Required if total_earned >= $600.00
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safe migration if table already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_verified BOOLEAN DEFAULT FALSE;

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
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 5.00),
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Profiles: Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  extracted_name := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'full_name', '')), '');
  IF extracted_name IS NULL OR length(extracted_name) < 2 THEN
    extracted_name := split_part(new.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, full_name, username, email)
  VALUES (
    new.id,
    extracted_name,
    LOWER(REGEXP_REPLACE(split_part(new.email, '@', 1) || '_' || SUBSTRING(new.id::text, 1, 4), '[^a-zA-Z0-9_]', '', 'g')),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email;
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

-- Posts: Admins can view all posts (draft, pending, rejected, published)
DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;
CREATE POLICY "Admins can view all posts" ON public.posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358'))
  );

-- Posts: Authors can create drafts
CREATE POLICY "Authors can insert own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Posts: Authors can update own drafts or pending posts (not published)
CREATE POLICY "Authors can update own drafts" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id AND status IN ('draft', 'pending', 'rejected'));

-- Posts: Admins can update all posts (to approve, reject, edit)
DROP POLICY IF EXISTS "Admins can update all posts" ON public.posts;
CREATE POLICY "Admins can update all posts" ON public.posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358'))
  );

-- Payouts: Admins can view all payout requests
DROP POLICY IF EXISTS "Admins can view all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358'))
  );

-- Payouts: Admins can update all payout requests (mark as paid, approved, declined)
DROP POLICY IF EXISTS "Admins can update all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can update all payout requests" ON public.payout_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358'))
  );

-- ==============================================================================
-- ZERO-TRUST HARDENING TRIGGERS (Blocks Mass-Assignment & Console Hacking)
-- ==============================================================================

-- 1. Lock down sensitive profile columns (is_admin, balances, tax_verified)
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Allow verified view procedure to credit earnings
  IF current_setting('zebblog.internal_proc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is admin
  SELECT (is_admin IS TRUE OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358') INTO caller_is_admin FROM public.profiles WHERE id = auth.uid();
  
  -- If NOT an admin, block any attempt to modify admin flag, balances, or tax status
  IF caller_is_admin IS NOT TRUE THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Security Violation: Only an administrator can modify admin privileges.';
    END IF;
    IF NEW.current_balance IS DISTINCT FROM OLD.current_balance OR NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
      RAISE EXCEPTION 'Security Violation: Balances and earnings can only be credited by verified views.';
    END IF;
    IF NEW.tax_verified IS DISTINCT FROM OLD.tax_verified THEN
      RAISE EXCEPTION 'Security Violation: Tax verification status must be verified by an administrator.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_security ON public.profiles;
CREATE TRIGGER trg_protect_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_security_fields();

-- 2. Lock down post status transitions (Prevent authors from self-publishing or faking views)
CREATE OR REPLACE FUNCTION public.protect_post_status_transitions()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Allow verified view procedure to increment views & earnings
  IF current_setting('zebblog.internal_proc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT (is_admin IS TRUE OR id = 'c3735295-8408-44ea-a4d8-b5f4b5077358') INTO caller_is_admin FROM public.profiles WHERE id = auth.uid();

  -- If NOT admin, authors can ONLY set status to 'draft' or 'pending'
  IF caller_is_admin IS NOT TRUE THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('draft', 'pending') THEN
      RAISE EXCEPTION 'Security Violation: Authors can only submit posts as draft or pending review.';
    END IF;
    -- Authors cannot manually inflate views or earnings via REST
    NEW.view_count := OLD.view_count;
    NEW.estimated_earnings := OLD.estimated_earnings;
    NEW.published_at := OLD.published_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_post_status ON public.posts;
CREATE TRIGGER trg_protect_post_status
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE public.protect_post_status_transitions();

-- 3. Lock down Payout Requests
DROP POLICY IF EXISTS "Authors can insert own payout requests" ON public.payout_requests;
CREATE POLICY "Authors can insert own payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND status = 'pending'
    AND amount >= 5.00
    AND amount <= (SELECT current_balance FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Authors can view own payout requests" ON public.payout_requests;
CREATE POLICY "Authors can view own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = author_id);


-- ==============================================================================
-- Stored Procedures: Record Verified View & Credit Author Earnings (Creator Partner)
-- Baseline RPM: $2.50 per 1,000 views => Author cut = $1.00 per 1,000 views ($0.001 per view)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_verified_view(target_post_id UUID, client_ip_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN := FALSE;
  post_author_id UUID;
  author_rate_per_view NUMERIC := 0.001; -- $1.00 per 1,000 views
BEGIN
  -- Mark transaction as internal authorized procedure to bypass anti-tamper triggers
  PERFORM set_config('zebblog.internal_proc', 'true', true);

  -- Insert into post_views ledger (unique daily view per IP hash)
  INSERT INTO public.post_views (post_id, ip_hash, viewed_at)
  VALUES (target_post_id, client_ip_hash, CURRENT_DATE)
  ON CONFLICT (post_id, ip_hash, viewed_at) DO NOTHING;

  IF FOUND THEN
    -- Increment post view_count and post estimated_earnings
    UPDATE public.posts
    SET view_count = COALESCE(view_count, 0) + 1,
        estimated_earnings = COALESCE(estimated_earnings, 0) + author_rate_per_view
    WHERE id = target_post_id
    RETURNING author_id INTO post_author_id;

    -- Credit the author's current_balance and total_earned
    IF post_author_id IS NOT NULL THEN
      UPDATE public.profiles
      SET current_balance = COALESCE(current_balance, 0) + author_rate_per_view,
          total_earned = COALESCE(total_earned, 0) + author_rate_per_view
      WHERE id = post_author_id;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. Storage Bucket & Policies for Blog Images (Compressed WebP)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload blog images'
  ) THEN
    CREATE POLICY "Authenticated users can upload blog images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can view blog images'
  ) THEN
    CREATE POLICY "Public can view blog images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'blog-images');
  END IF;
END $$;
