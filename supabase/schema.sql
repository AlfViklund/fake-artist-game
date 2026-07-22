-- Database schema for Fake Artist party game
-- Stack: Supabase (PostgreSQL), RLS, Realtime Broadcast

-- Create rooms status enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
        CREATE TYPE game_status AS ENUM ('lobby', 'drawing', 'voting', 'fake_guess', 'results');
    END IF;
END$$;

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    status game_status NOT NULL DEFAULT 'lobby',
    category VARCHAR(255),
    secret_word VARCHAR(255),
    fake_player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    current_turn_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    turn_ends_at TIMESTAMPTZ,
    current_round INTEGER NOT NULL DEFAULT 1,
    max_rounds INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create room players table
CREATE TABLE IF NOT EXISTS room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    avatar_color VARCHAR(50),
    score INTEGER NOT NULL DEFAULT 0,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, user_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suspect_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (room_id, voter_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- SECURITY BARRIER VIEW TO SECURE SECRET WORD
---------------------------------------------------------
-- Postgres RLS is row-level and cannot dynamically mask columns for specific users
-- while leaving other columns readable. A Security Barrier View is the standard, 
-- secure Postgres way to enforce column-level visibility check.
CREATE OR REPLACE VIEW rooms_session WITH (security_barrier) AS
SELECT 
    id,
    code,
    status,
    category,
    CASE 
        -- Reveal secret word only if the game is over/guessing,
        -- or if the user is NOT the fake artist, or if no fake artist is assigned yet.
        WHEN status IN ('results', 'fake_guess') 
             OR fake_player_id IS NULL 
             OR auth.uid() <> fake_player_id 
        THEN secret_word
        ELSE NULL
    END AS secret_word,
    fake_player_id,
    current_turn_user_id,
    turn_ends_at,
    current_round,
    max_rounds,
    created_at
FROM rooms;

-- Enable select access on the view
GRANT SELECT ON rooms_session TO authenticated, anon;


---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

-- 1. ROOMS Policies
CREATE POLICY "Anyone can view rooms" ON rooms
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Anyone can insert rooms" ON rooms
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Host can update rooms, or players can update current turn/status if authorized
CREATE POLICY "Host can update rooms" ON rooms
    FOR UPDATE
    TO authenticated, anon
    USING (
        EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = rooms.id
              AND room_players.user_id = auth.uid()
              AND room_players.is_host = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = rooms.id
              AND room_players.user_id = auth.uid()
              AND room_players.is_host = true
        )
    );

-- 2. ROOM PLAYERS Policies
CREATE POLICY "Anyone can view players in their rooms" ON room_players
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Players can insert themselves into rooms" ON room_players
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own status" ON room_players
    FOR UPDATE
    TO authenticated, anon
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = room_players.room_id
          AND rp.user_id = auth.uid()
          AND rp.is_host = true
    ))
    WITH CHECK (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = room_players.room_id
          AND rp.user_id = auth.uid()
          AND rp.is_host = true
    ));

CREATE POLICY "Players can leave rooms or host can kick" ON room_players
    FOR DELETE
    TO authenticated, anon
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM room_players rp
        WHERE rp.room_id = room_players.room_id
          AND rp.user_id = auth.uid()
          AND rp.is_host = true
    ));

-- 3. VOTES Policies
CREATE POLICY "Anyone in the room can view votes" ON votes
    FOR SELECT
    TO authenticated, anon
    USING (
        EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = votes.room_id
              AND room_players.user_id = auth.uid()
        )
    );

CREATE POLICY "Players can cast vote" ON votes
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (
        auth.uid() = voter_id
        AND EXISTS (
            SELECT 1 FROM room_players
            WHERE room_players.room_id = votes.room_id
              AND room_players.user_id = auth.uid()
        )
    );


---------------------------------------------------------
-- SECURITY DEFINER MANAGEMENT FUNCTIONS (GAME STATE ENGINE)
---------------------------------------------------------

-- Function to create a lobby room and join as Host
CREATE OR REPLACE FUNCTION create_new_room(
    p_code VARCHAR(10),
    p_nickname VARCHAR(50),
    p_avatar_color VARCHAR(50),
    p_max_rounds INTEGER DEFAULT 2
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated';
    END IF;

    -- Create room
    INSERT INTO rooms (code, status, max_rounds)
    VALUES (upper(p_code), 'lobby', p_max_rounds)
    RETURNING id INTO v_room_id;

    -- Add host
    INSERT INTO room_players (room_id, user_id, nickname, avatar_color, is_host, is_ready)
    VALUES (v_room_id, v_user_id, p_nickname, p_avatar_color, true, true);

    RETURN v_room_id;
END;
$$;

-- Function to start a game (Restricted to Host)
CREATE OR REPLACE FUNCTION start_game(
    p_room_id UUID,
    p_category VARCHAR(255),
    p_secret_word VARCHAR(255)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_players_count INTEGER;
    v_fake_artist_id UUID;
    v_first_turn_user_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Verify host status
    IF NOT EXISTS (
        SELECT 1 FROM room_players
        WHERE room_id = p_room_id AND user_id = v_caller_id AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Only the room host can start the game';
    END IF;

    -- Count players (Fake Artist needs at least 3 players to be fun, standard 4-10)
    SELECT count(*) INTO v_players_count
    FROM room_players
    WHERE room_id = p_room_id;

    IF v_players_count < 3 THEN
        RAISE EXCEPTION 'At least 3 players are required to start the game';
    END IF;

    -- Select a random player to be the Fake Artist (including host if they are playing, or any player in room)
    SELECT user_id INTO v_fake_artist_id
    FROM room_players
    WHERE room_id = p_room_id
    ORDER BY random()
    LIMIT 1;

    -- Choose first player to draw (often host or another player)
    -- We can order them randomly or by join order. Let's make it the host or a random player.
    SELECT user_id INTO v_first_turn_user_id
    FROM room_players
    WHERE room_id = p_room_id
    ORDER BY is_host DESC, joined_at ASC
    LIMIT 1;

    -- Delete any votes from previous sessions
    DELETE FROM votes WHERE room_id = p_room_id;

    -- Update Room status
    UPDATE rooms
    SET 
        status = 'drawing',
        category = p_category,
        secret_word = p_secret_word,
        fake_player_id = v_fake_artist_id,
        current_turn_user_id = v_first_turn_user_id,
        current_round = 1,
        turn_ends_at = now() + INTERVAL '45 seconds'
    WHERE id = p_room_id;
END;
$$;

-- Function to advance painter turn or round
CREATE OR REPLACE FUNCTION advance_turn(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status game_status;
    v_current_painter UUID;
    v_current_round INTEGER;
    v_max_rounds INTEGER;
    v_next_painter UUID;
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    
    -- Get current state
    SELECT status, current_turn_user_id, current_round, max_rounds
    INTO v_current_status, v_current_painter, v_current_round, v_max_rounds
    FROM rooms
    WHERE id = p_room_id;

    IF v_current_status <> 'drawing' THEN
        RAISE EXCEPTION 'Can only advance turns during the drawing phase';
    END IF;

    -- Verify that the caller is either the current painter or the host (in case of timeout)
    IF v_caller_id <> v_current_painter AND NOT EXISTS (
        SELECT 1 FROM room_players
        WHERE room_id = p_room_id AND user_id = v_caller_id AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Not authorized to advance turn';
    END IF;

    -- Determine next painter by join order (joined_at)
    -- Find the first player who joined after the current painter
    SELECT user_id INTO v_next_painter
    FROM room_players
    WHERE room_id = p_room_id 
      AND joined_at > (
          SELECT joined_at FROM room_players 
          WHERE room_id = p_room_id AND user_id = v_current_painter
      )
    ORDER BY joined_at ASC
    LIMIT 1;

    -- If no player is found, it means the round is complete (we went through all players)
    IF v_next_painter IS NULL THEN
        -- Check if we have more rounds
        IF v_current_round < v_max_rounds THEN
            -- Reset to the first player who joined for next round
            SELECT user_id INTO v_next_painter
            FROM room_players
            WHERE room_id = p_room_id
            ORDER BY joined_at ASC
            LIMIT 1;

            UPDATE rooms
            SET 
                current_round = v_current_round + 1,
                current_turn_user_id = v_next_painter,
                turn_ends_at = now() + INTERVAL '45 seconds'
            WHERE id = p_room_id;
        ELSE
            -- No more rounds left! Transition to voting phase
            UPDATE rooms
            SET 
                status = 'voting',
                current_turn_user_id = NULL,
                turn_ends_at = NULL
            WHERE id = p_room_id;
            
            -- Clear previous votes just in case
            DELETE FROM votes WHERE room_id = p_room_id;
        END IF;
    ELSE
        -- Next player's turn in the current round
        UPDATE rooms
        SET 
            current_turn_user_id = v_next_painter,
            turn_ends_at = now() + INTERVAL '45 seconds'
        WHERE id = p_room_id;
    END IF;
END;
$$;

-- Function to submit a vote
CREATE OR REPLACE FUNCTION submit_vote(
    p_room_id UUID,
    p_suspect_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voter_id UUID;
    v_total_players INTEGER;
    v_votes_count INTEGER;
    v_fake_player_id UUID;
    
    v_most_voted_id UUID;
    v_max_votes INTEGER;
    v_is_tie BOOLEAN;
BEGIN
    v_voter_id := auth.uid();
    IF v_voter_id IS NULL THEN
        RAISE EXCEPTION 'Must be authenticated to vote';
    END IF;

    -- Insert or update the vote
    INSERT INTO votes (room_id, voter_id, suspect_id)
    VALUES (p_room_id, v_voter_id, p_suspect_id)
    ON CONFLICT (room_id, voter_id) 
    DO UPDATE SET suspect_id = EXCLUDED.suspect_id;

    -- Check if everyone has voted
    SELECT count(*) INTO v_total_players FROM room_players WHERE room_id = p_room_id;
    SELECT count(*) INTO v_votes_count FROM votes WHERE room_id = p_room_id;

    -- If all players have voted, evaluate the vote outcome
    IF v_votes_count = v_total_players THEN
        -- Get the fake artist id
        SELECT fake_player_id INTO v_fake_player_id FROM rooms WHERE id = p_room_id;

        -- Count votes per suspect
        -- Find who got the max votes
        WITH vote_counts AS (
            SELECT suspect_id, count(*) as cnt
            FROM votes
            WHERE room_id = p_room_id
            GROUP BY suspect_id
        ),
        ordered_votes AS (
            SELECT suspect_id, cnt,
                   rank() OVER (ORDER BY cnt DESC) as rk
            FROM vote_counts
        )
        SELECT suspect_id, cnt INTO v_most_voted_id, v_max_votes
        FROM ordered_votes
        WHERE rk = 1
        LIMIT 1;

        -- Check if it's a tie
        SELECT (count(*) > 1) INTO v_is_tie
        FROM (
            SELECT suspect_id
            FROM votes
            WHERE room_id = p_room_id
            GROUP BY suspect_id
            HAVING count(*) = v_max_votes
        ) AS ties;

        -- Game transition logic:
        -- In Fake Artist, if the Fake Artist gets the most votes (and no tie for first place),
        -- the Fake Artist gets a chance to guess the secret word.
        -- Otherwise (wrong player caught or a tie), Fake Artist wins immediately.
        IF NOT v_is_tie AND v_most_voted_id = v_fake_player_id THEN
            -- Fake Artist was caught! Give them a chance to guess
            UPDATE rooms
            SET status = 'fake_guess'
            WHERE id = p_room_id;
        ELSE
            -- Fake Artist escaped! Fake Artist wins. Update status to results.
            UPDATE rooms
            SET status = 'results'
            WHERE id = p_room_id;

            -- Reward Fake Artist with points
            UPDATE room_players
            SET score = score + 2
            WHERE room_id = p_room_id AND user_id = v_fake_player_id;
        END IF;

    END IF;
END;
$$;

-- Function for Fake Artist to submit their guess
CREATE OR REPLACE FUNCTION submit_fake_guess(
    p_room_id UUID,
    p_guess VARCHAR(255)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_fake_player_id UUID;
    v_secret_word VARCHAR(255);
    v_status game_status;
    v_correct BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    
    SELECT status, fake_player_id, secret_word
    INTO v_status, v_fake_player_id, v_secret_word
    FROM rooms
    WHERE id = p_room_id;

    IF v_status <> 'fake_guess' THEN
        RAISE EXCEPTION 'Guessing is only allowed in fake_guess phase';
    END IF;

    IF v_caller_id <> v_fake_player_id THEN
        RAISE EXCEPTION 'Only the Fake Artist can make the guess';
    END IF;

    -- Compare guess (case-insensitive, trimmed)
    IF lower(trim(p_guess)) = lower(trim(v_secret_word)) THEN
        v_correct := true;
        
        -- Fake Artist guessed it right! They win and get points.
        UPDATE room_players
        SET score = score + 2
        WHERE room_id = p_room_id AND user_id = v_fake_player_id;
    ELSE
        v_correct := false;

        -- Fake Artist failed to guess. Real artists win! (Reward points to all other players)
        UPDATE room_players
        SET score = score + 1
        WHERE room_id = p_room_id AND user_id <> v_fake_player_id;
    END IF;

    -- Finish game
    UPDATE rooms
    SET status = 'results'
    WHERE id = p_room_id;

    RETURN v_correct;
END;
$$;
