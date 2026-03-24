
-- ══════════════════════════════════════════════════════════════
--  LactaMe — Schema de actualización segura
--  Ejecuta este script completo en Supabase > SQL Editor > Run
--  Es seguro correrlo varias veces (idempotente)
-- ══════════════════════════════════════════════════════════════

-- ── 1. PERFILES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  plan         TEXT DEFAULT 'free',
  role         TEXT DEFAULT 'usuaria',
  settings     JSONB DEFAULT '{"unit":"oz","notif":false,"vibrate":false}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- Columnas nuevas (seguro si ya existen)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'usuaria';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Perfil propio" ON public.profiles;
CREATE POLICY "Perfil propio" ON public.profiles FOR ALL USING (auth.uid() = id);

-- ── 2. EXTRACCIONES ───────────────────────────────────────────
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
DROP POLICY IF EXISTS "Extracciones propias" ON public.extractions;
CREATE POLICY "Extracciones propias" ON public.extractions FOR ALL USING (auth.uid() = user_id);

-- ── 3. PUBLICACIONES COMUNIDAD ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT,
  username     TEXT,
  group_name   TEXT NOT NULL,
  title        TEXT DEFAULT '',
  body         TEXT NOT NULL,
  anonymous    BOOLEAN DEFAULT FALSE,
  role         TEXT DEFAULT 'usuaria',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'usuaria';

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leer posts"             ON public.posts;
DROP POLICY IF EXISTS "Crear posts"            ON public.posts;
DROP POLICY IF EXISTS "Eliminar posts propios" ON public.posts;
CREATE POLICY "Leer posts"             ON public.posts FOR SELECT USING (true);
CREATE POLICY "Crear posts"            ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Eliminar posts propios" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ── 4. LIKES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leer likes"      ON public.likes;
DROP POLICY IF EXISTS "Gestionar likes" ON public.likes;
CREATE POLICY "Leer likes"      ON public.likes FOR SELECT USING (true);
CREATE POLICY "Gestionar likes" ON public.likes FOR ALL    USING (auth.uid() = user_id);

-- ── 5. SUSCRIPCIONES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan                   TEXT DEFAULT 'free',
  status                 TEXT DEFAULT 'active',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver suscripción propia"    ON public.subscriptions;
DROP POLICY IF EXISTS "Editar suscripción propia" ON public.subscriptions;
CREATE POLICY "Ver suscripción propia"    ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Editar suscripción propia" ON public.subscriptions FOR ALL    USING (auth.uid() = user_id);

-- ── 6. FEEDBACK / BUZÓN ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email      TEXT,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insertar feedback propio" ON public.feedback;
DROP POLICY IF EXISTS "Admin lee feedback"        ON public.feedback;
DROP POLICY IF EXISTS "Admin actualiza feedback"  ON public.feedback;
CREATE POLICY "Insertar feedback propio" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin lee feedback"       ON public.feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);
CREATE POLICY "Admin actualiza feedback" ON public.feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin'))
);

-- ── 7. TRIGGER: crear perfil al registrarse ───────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, plan, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    'free',
    'usuaria'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 8. POLÍTICAS ADMIN — leer y editar todos los perfiles ─────
DROP POLICY IF EXISTS "Admin lee perfiles"        ON public.profiles;
DROP POLICY IF EXISTS "Admin actualiza perfiles"  ON public.profiles;

CREATE POLICY "Admin lee perfiles" ON public.profiles FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid() AND p2.role IN ('owner','admin')
  )
);
CREATE POLICY "Admin actualiza perfiles" ON public.profiles FOR UPDATE USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = auth.uid() AND p2.role IN ('owner','admin')
  )
);
