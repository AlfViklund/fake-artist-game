-- Drop foreign key constraints on voter_id and suspect_id in votes table for anonymous guests
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_voter_id_fkey;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_suspect_id_fkey;
