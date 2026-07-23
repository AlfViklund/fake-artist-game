-- Drop old strict policies if any
DROP POLICY IF EXISTS "Anyone can view rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Host can update rooms" ON rooms;
DROP POLICY IF EXISTS "Allow all rooms" ON rooms;

DROP POLICY IF EXISTS "Anyone can view players in their rooms" ON room_players;
DROP POLICY IF EXISTS "Players can insert themselves into rooms" ON room_players;
DROP POLICY IF EXISTS "Players can update their own status" ON room_players;
DROP POLICY IF EXISTS "Players can leave rooms or host can kick" ON room_players;
DROP POLICY IF EXISTS "Allow all room_players" ON room_players;

DROP POLICY IF EXISTS "Anyone in the room can view votes" ON votes;
DROP POLICY IF EXISTS "Players can cast vote" ON votes;
DROP POLICY IF EXISTS "Allow all votes" ON votes;

DROP POLICY IF EXISTS "Allow all unique_players" ON unique_players;

-- Enable RLS and add permissive policies for all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all rooms" ON rooms FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all room_players" ON room_players FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all votes" ON votes FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE unique_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all unique_players" ON unique_players FOR ALL TO public USING (true) WITH CHECK (true);
