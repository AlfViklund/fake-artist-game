-- Unique Players Table for tracking unique total players who ever played
CREATE TABLE IF NOT EXISTS public.unique_players (
  user_id UUID PRIMARY KEY,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.unique_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on unique_players" ON public.unique_players
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow insert/update on unique_players" ON public.unique_players
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
