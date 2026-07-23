-- Enable Supabase Realtime Postgres Changes publication for rooms, room_players, and votes
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE rooms, room_players, votes;
COMMIT;
