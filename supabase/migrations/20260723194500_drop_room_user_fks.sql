-- Drop foreign key constraints on fake_player_id and current_turn_user_id so anonymous guests can play
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_fake_player_id_fkey;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_current_turn_user_id_fkey;
