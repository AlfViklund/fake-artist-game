-- Ensure ALL existing policies on all tables are dropped and replaced with permissive policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all rooms" ON rooms FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all room_players" ON room_players FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all votes" ON votes FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE unique_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all unique_players" ON unique_players FOR ALL TO public USING (true) WITH CHECK (true);
