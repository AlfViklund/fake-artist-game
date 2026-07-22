'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, RoomPlayer, Vote, StrokeData } from '@/types/game';
import { getRandomWord } from '@/lib/wordBank';
import Lobby from '@/components/Lobby';
import DrawingCanvas from '@/components/DrawingCanvas';
import VotingPhase from '@/components/VotingPhase';
import FakeGuessPhase from '@/components/FakeGuessPhase';
import ResultsPhase from '@/components/ResultsPhase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Eye, EyeOff, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSecretWord, setShowSecretWord] = useState(true);

  // Load initial room data
  const loadRoomData = useCallback(async () => {
    try {
      // Get current auth session user
      const { data: authSession } = await supabase.auth.getSession();
      let userId = authSession?.session?.user?.id;

      if (!userId) {
        // Fallback to local storage or anonymous auth
        const local = localStorage.getItem(`fake_artist_user_${roomCode}`);
        if (local) {
          const parsed = JSON.parse(local);
          userId = parsed.userId;
        }
      }

      if (!userId) {
        let guestId = localStorage.getItem('fake_artist_guest_id');
        if (!guestId) {
          guestId = crypto.randomUUID();
          localStorage.setItem('fake_artist_guest_id', guestId);
        }
        userId = guestId;
      }

      if (!userId) {
        setError('Не удалось установить авторизацию');
        setLoading(false);
        return;
      }

      setCurrentUserId(userId);

      // Fetch Room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomErr || !roomData) {
        setError('Комната не найдена');
        setLoading(false);
        return;
      }

      setRoom(roomData as Room);

      // Fetch Players
      const { data: playersData } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      setPlayers((playersData || []) as RoomPlayer[]);

      // Fetch Votes if voting phase
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomData.id);

      setVotes((votesData || []) as Vote[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка загрузки данных комнаты');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  // Subscribe to Realtime Postgres changes and Broadcasts
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room_${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as Room);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        () => {
          loadRoomData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${room.id}` },
        () => {
          loadRoomData();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, loadRoomData]);

  // Start Game logic (Host only)
  const handleStartGame = async (categoryId: string | null, customWord?: string | null) => {
    if (!room || players.length < 3) return;

    // Pick word & category
    const { category, word } = customWord
      ? { category: 'Свое слово', word: customWord }
      : getRandomWord(categoryId || undefined);

    // Randomly select Fake Player
    const randomFakeIndex = Math.floor(Math.random() * players.length);
    const fakePlayerId = players[randomFakeIndex].user_id;

    // Turn order
    const turnOrder = players.map((p) => p.user_id);
    // Shuffle turn order
    for (let i = turnOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [turnOrder[i], turnOrder[j]] = [turnOrder[j], turnOrder[i]];
    }

    // Reset votes
    await supabase.from('votes').delete().eq('room_id', room.id);

    // Update Room DB state
    await supabase
      .from('rooms')
      .update({
        status: 'drawing',
        category,
        secret_word: word,
        fake_player_id: fakePlayerId,
        current_turn_user_id: turnOrder[0],
        turn_order: turnOrder,
        turn_index: 0,
        current_round: 1,
        max_rounds: 2,
        winner: null,
      })
      .eq('id', room.id);
  };

  // Handle Turn End after drawing a stroke
  const handleStrokeComplete = async (stroke: StrokeData) => {
    if (!room || room.status !== 'drawing') return;

    const turnOrder: string[] = room.turn_order || players.map((p) => p.user_id);
    const nextIndex = ((room.turn_index ?? 0) + 1) % turnOrder.length;
    const isRoundComplete = nextIndex === 0;
    const nextRound = isRoundComplete ? room.current_round + 1 : room.current_round;

    if (nextRound > (room.max_rounds || 2)) {
      // Drawing completed -> Move to Voting Phase!
      await supabase
        .from('rooms')
        .update({
          status: 'voting',
          current_turn_user_id: null,
        })
        .eq('id', room.id);
    } else {
      // Advance to next player
      await supabase
        .from('rooms')
        .update({
          turn_index: nextIndex,
          current_turn_user_id: turnOrder[nextIndex],
          current_round: nextRound,
        })
        .eq('id', room.id);
    }
  };

  // Handle Vote casting
  const handleCastVote = async (suspectUserId: string) => {
    if (!room || !currentUserId) return;

    await supabase.from('votes').insert({
      room_id: room.id,
      voter_id: currentUserId,
      suspect_id: suspectUserId,
    });

    // Check if all players voted
    const { data: updatedVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', room.id);

    if (updatedVotes && updatedVotes.length >= players.length) {
      // Tally votes
      const voteCounts: Record<string, number> = {};
      updatedVotes.forEach((v: Vote) => {
        voteCounts[v.suspect_id] = (voteCounts[v.suspect_id] || 0) + 1;
      });

      let maxVotes = 0;
      let mostVotedUserId: string | null = null;

      Object.entries(voteCounts).forEach(([suspectId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          mostVotedUserId = suspectId;
        }
      });

      if (mostVotedUserId === room.fake_player_id) {
        // Fake Caught! Go to Fake Guess Phase
        await supabase
          .from('rooms')
          .update({ status: 'fake_guess' })
          .eq('id', room.id);
      } else {
        // Fake Escaped! Fake wins!
        await supabase
          .from('rooms')
          .update({ status: 'results', winner: 'fake' })
          .eq('id', room.id);

        // Award score to Fake
        if (room.fake_player_id) {
          await supabase.rpc('increment_score', {
            player_user_id: room.fake_player_id,
            points: 2,
          });
        }
      }
    }
  };

  // Handle Fake Guess submission
  const handleFakeGuessSubmit = async (guessWord: string) => {
    if (!room) return;

    const isCorrect = guessWord.toLowerCase().trim() === (room.secret_word || '').toLowerCase().trim();

    const winner = isCorrect ? 'fake' : 'artists';

    await supabase
      .from('rooms')
      .update({ status: 'results', winner })
      .eq('id', room.id);
  };

  // Next Round Trigger
  const handleNextRound = async () => {
    if (!room) return;
    await supabase
      .from('rooms')
      .update({ status: 'lobby' })
      .eq('id', room.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-mono">Подключение к комнате...</span>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-6 rounded-2xl border border-red-500/40 text-center flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-slate-200 font-bold">{error || 'Комната не найдена'}</p>
          <button
            onClick={() => router.push('/')}
            className="py-2 px-5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> На главную
          </button>
        </div>
      </div>
    );
  }

  const isHost = players.find((p) => p.user_id === currentUserId)?.is_host || false;
  const isFakePlayer = currentUserId === room.fake_player_id;
  const activeDrawer = players.find((p) => p.user_id === room.current_turn_user_id);
  const isMyTurn = currentUserId === room.current_turn_user_id;

  return (
    <div className="min-h-screen flex flex-col p-2 md:p-6 max-w-6xl mx-auto w-full gap-4">
      {/* Top Game Bar during Active Game */}
      {room.status !== 'lobby' && (
        <div className="flex flex-wrap items-center justify-between p-4 glass-panel rounded-2xl border border-pink-500/30 gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-cyan-400 text-lg">#{room.code}</span>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-xs text-slate-400 font-medium">
              Категория: <strong className="text-slate-200">{room.category}</strong>
            </span>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-xs text-slate-400">
              Раунд: <strong className="text-pink-400">{room.current_round} / {room.max_rounds}</strong>
            </span>
          </div>

          {/* Secret Word Card */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-xl border border-pink-500/40">
            <span className="text-xs text-slate-400">Слово:</span>
            {isFakePlayer ? (
              <span className="text-xs font-mono font-bold text-amber-400 uppercase bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
                ВЫ — ФЕЙК! (Не знаете слово)
              </span>
            ) : showSecretWord ? (
              <span className="text-sm font-mono font-black text-pink-400 tracking-wider">
                {room.secret_word}
              </span>
            ) : (
              <span className="text-sm font-mono text-slate-600">••••••••</span>
            )}

            {!isFakePlayer && (
              <button
                onClick={() => setShowSecretWord(!showSecretWord)}
                className="text-slate-500 hover:text-slate-300 ml-1"
              >
                {showSecretWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Render Current Phase */}
      {room.status === 'lobby' && (
        <Lobby
          room={room}
          players={players}
          currentUserId={currentUserId || ''}
          onStartGame={(cat, word) => handleStartGame(cat, word)}
          onToggleReady={() => {}}
        />
      )}

      {room.status === 'drawing' && (
        <DrawingCanvas
          isMyTurn={isMyTurn}
          activeDrawerNickname={activeDrawer?.nickname}
          realtimeChannel={realtimeChannel}
          onStrokeComplete={handleStrokeComplete}
        />
      )}

      {room.status === 'voting' && (
        <VotingPhase
          room={room}
          players={players}
          currentUserId={currentUserId || ''}
          votes={votes}
          onVote={handleCastVote}
        />
      )}

      {room.status === 'fake_guess' && (
        <FakeGuessPhase
          room={room}
          players={players}
          currentUserId={currentUserId || ''}
          onSubmitGuess={handleFakeGuessSubmit}
        />
      )}

      {room.status === 'results' && (
        <ResultsPhase
          room={room}
          players={players}
          currentUserId={currentUserId || ''}
          isHost={isHost}
          onNextRound={handleNextRound}
        />
      )}
    </div>
  );
}
