
-- ── 1. PERFILES (con columna plan) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan         TEXT DEFAULT 'free' CHECK (plan IN ('free','premium')),
  settings     JSONB DEFAULT '{"unit":"oz","notif":false,"vibrate":false}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfil propio" ON public.profiles FOR ALL USING (auth.uid() = id);

-- ── 2. EXTRACCIONES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extractions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  time       TIME NOT NULL,
  amount_ml  DECIMAL(8,2) DEFAULT 0,
  duration   INTEGER DEFAULT 0,
  notes      TEXT DEFAULT '',
  storage    VARCHAR(20) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Extracciones propias" ON public.extractions FOR ALL USING (auth.uid() = user_id);

-- ── 3. PUBLICACIONES COMUNIDAD ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT, username TEXT,
  group_name   TEXT NOT NULL,
  title        TEXT DEFAULT '',
  body         TEXT NOT NULL,
  anonymous    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer posts"          ON public.posts FOR SELECT USING (true);
CREATE POLICY "Crear posts"         ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar posts propios" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ── 4. LIKES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer likes"     ON public.likes FOR SELECT USING (true);
CREATE POLICY "Gestionar likes" ON public.likes FOR ALL   USING (auth.uid() = user_id);

-- ── 5. SUSCRIPCIONES (para integración futura con Stripe) ───
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan                   TEXT DEFAULT 'free' CHECK (plan IN ('free','premium')),
  status                 TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver suscripción propia"    ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Editar suscripción propia" ON public.subscriptions FOR ALL    USING (auth.uid() = user_id);

-- ── 6. TRIGGER: crear perfil + suscripción al registrarse ───
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, plan)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name',
    'free'
  );
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 7. Si ya tienes la tabla profiles, agrega la columna plan:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

