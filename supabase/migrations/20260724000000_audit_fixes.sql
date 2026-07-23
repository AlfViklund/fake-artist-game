-- Audit Fixes Migration
-- 1. Helper function for atomic score incrementing
CREATE OR REPLACE FUNCTION public.increment_score(player_user_id UUID, points INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.room_players
  SET score = score + points
  WHERE user_id = player_user_id;
END;
$$;

-- 2. Helper function to verify fake artist guess server-side without leaking secret_word
CREATE OR REPLACE FUNCTION public.verify_fake_guess(p_room_id UUID, p_guess TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_secret TEXT;
  v_clean_guess TEXT;
  v_clean_secret TEXT;
BEGIN
  SELECT secret_word INTO v_secret FROM public.rooms WHERE id = p_room_id;
  IF v_secret IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_clean_guess := lower(regexp_replace(p_guess, '[^\wа-яё]', '', 'g'));
  v_clean_secret := lower(regexp_replace(v_secret, '[^\wа-яё]', '', 'g'));
  
  RETURN (v_clean_guess = v_clean_secret AND length(v_clean_secret) > 0);
END;
$$;

-- 3. Indexes on foreign key columns to optimize cascading queries & deletes
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_votes_room_id ON public.votes(room_id);

-- 4. Database trigger to automatically clean up empty rooms & votes when last player exits
CREATE OR REPLACE FUNCTION delete_empty_room_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = OLD.room_id) THEN
    DELETE FROM public.votes WHERE room_id = OLD.room_id;
    DELETE FROM public.rooms WHERE id = OLD.room_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_empty_rooms ON public.room_players;
CREATE TRIGGER cleanup_empty_rooms
AFTER DELETE ON public.room_players
FOR EACH ROW EXECUTE FUNCTION delete_empty_room_trigger();
