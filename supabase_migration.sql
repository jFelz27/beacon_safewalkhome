-- 1. FIRST, CREATE THE USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    saved_home_address TEXT,
    saved_contact_address_1 TEXT,
    saved_contact_address_2 TEXT,
    safe_arrival_password_hash TEXT NOT NULL,
    walk_route_settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE THE EPHEMERAL ACTIVE ROUTES TABLE
CREATE TABLE IF NOT EXISTS public.active_routes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    current_lat NUMERIC NOT NULL,
    current_lon NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_routes ENABLE ROW LEVEL SECURITY;

-- 4. APPLY THE SECURITY FIREWALL POLICIES
CREATE POLICY "Users can only view and modify their own settings" 
ON public.user_settings 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only view and modify their own active tracking routes" 
ON public.active_routes 
FOR ALL 
USING (auth.uid() = user_id);