-- Drop foreign key constraint on user_id so anonymous guests can play
ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;
