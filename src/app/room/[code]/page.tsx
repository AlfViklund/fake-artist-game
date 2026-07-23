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
      .on('broadcast', { event: 'player_joined' }, () => {
        loadRoomData();
      })
      .on('broadcast', { event: 'player_left' }, () => {
        loadRoomData();
      })
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id, loadRoomData]);

  // Tab visibility & Window Focus handler for instant sync when switching back to tab
  useEffect(() => {
    const handleSyncOnFocus = () => {
      if (document.visibilityState === 'visible') {
        loadRoomData();
      }
    };

    document.addEventListener('visibilitychange', handleSyncOnFocus);
    window.addEventListener('focus', handleSyncOnFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleSyncOnFocus);
      window.removeEventListener('focus', handleSyncOnFocus);
    };
  }, [loadRoomData]);

  // Polling fallback to guarantee room state & player sync across all devices
  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(() => {
      loadRoomData();
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, loadRoomData]);

  // Global Realtime Presence tracking while inside game room
  useEffect(() => {
    if (!currentUserId) return;

    const presenceChannel = supabase.channel('global_online_presence', {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
          user_id: currentUserId,
        });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId]);

  // Auto-remove player from room on browser tab close / unload
  useEffect(() => {
    if (!room?.id || !currentUserId) return;

    const handleTabClose = () => {
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwjqcmuzylsjskozpzkh.supabase.co';
      const url = `${baseUrl}/rest/v1/room_players?room_id=eq.${room.id}&user_id=eq.${currentUserId}`;
      const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      try {
        fetch(url, {
          method: 'DELETE',
          headers: {
            'apikey': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          keepalive: true,
        });
      } catch {
        // ignore unload error
      }
    };

    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('pagehide', handleTabClose);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('pagehide', handleTabClose);
    };
  }, [room?.id, currentUserId]);

  // Start Game logic (Host only)
  const handleStartGame = async (categoryId: string | null, customWord?: string | null) => {
    if (!room || players.length < 2) return;

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

    await loadRoomData();
  };

  // Handle Turn End after drawing a stroke
  // Handle Turn End after drawing a stroke
  const handleStrokeComplete = async (stroke: StrokeData, dataUrl?: string) => {
    if (!room || room.status !== 'drawing' || room.current_turn_user_id !== currentUserId) return;

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
          recap_image_url: dataUrl || room.recap_image_url,
        })
        .eq('id', room.id)
        .eq('status', 'drawing');

      await loadRoomData();
    } else {
      // Advance to next player
      await supabase
        .from('rooms')
        .update({
          turn_index: nextIndex,
          current_turn_user_id: turnOrder[nextIndex],
          current_round: nextRound,
          recap_image_url: dataUrl || room.recap_image_url,
        })
        .eq('id', room.id)
        .eq('status', 'drawing');

      await loadRoomData();
    }
  };

  // Handle Vote casting
  const handleCastVote = async (suspectUserId: string) => {
    if (!room || !currentUserId || room.status !== 'voting') return;

    await supabase.from('votes').upsert({
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
      let isTie = false;

      Object.entries(voteCounts).forEach(([suspectId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          mostVotedUserId = suspectId;
          isTie = false;
        } else if (count === maxVotes) {
          isTie = true;
        }
      });

      // Atomic phase transition using .eq('status', 'voting')
      if (!isTie && mostVotedUserId === room.fake_player_id) {
        // Fake Caught! Go to Fake Guess Phase
        await supabase
          .from('rooms')
          .update({ status: 'fake_guess' })
          .eq('id', room.id)
          .eq('status', 'voting');
      } else {
        // Fake Escaped! Fake wins!
        const { data: updatedRoom } = await supabase
          .from('rooms')
          .update({ status: 'results', winner: 'fake' })
          .eq('id', room.id)
          .eq('status', 'voting')
          .select();

        // Award score to Fake ONLY if update actually transitioned
        if (updatedRoom && updatedRoom.length > 0 && room.fake_player_id) {
          const fakePl = players.find((p) => p.user_id === room.fake_player_id);
          const { error: rpcErr } = await supabase.rpc('increment_score', {
            player_user_id: room.fake_player_id,
            points: 2,
          });
          if (rpcErr && fakePl) {
            await supabase
              .from('room_players')
              .update({ score: fakePl.score + 2 })
              .eq('room_id', room.id)
              .eq('user_id', room.fake_player_id);
          }
        }
      }
    }
  };

  // Handle Fake Guess submission
  const handleFakeGuessSubmit = async (guessWord: string) => {
    if (!room) return;

    const cleanGuess = guessWord.toLowerCase().replace(/[^\wа-яё]/gi, '');
    const cleanSecret = (room.secret_word || '').toLowerCase().replace(/[^\wа-яё]/gi, '');

    const isCorrect = cleanGuess === cleanSecret && cleanSecret.length > 0;
    const winner = isCorrect ? 'fake' : 'artists';

    await supabase
      .from('rooms')
      .update({ status: 'results', winner })
      .eq('id', room.id);

    // Award scores
    if (isCorrect && room.fake_player_id) {
      const fakePl = players.find((p) => p.user_id === room.fake_player_id);
      const { error: rpcErr } = await supabase.rpc('increment_score', {
        player_user_id: room.fake_player_id,
        points: 2,
      });
      if (rpcErr && fakePl) {
        await supabase
          .from('room_players')
          .update({ score: fakePl.score + 2 })
          .eq('room_id', room.id)
          .eq('user_id', room.fake_player_id);
      }
    } else {
      const artists = players.filter((p) => p.user_id !== room.fake_player_id);
      for (const artist of artists) {
        const { error: rpcErr } = await supabase.rpc('increment_score', {
          player_user_id: artist.user_id,
          points: 1,
        });
        if (rpcErr) {
          await supabase
            .from('room_players')
            .update({ score: artist.score + 1 })
            .eq('room_id', room.id)
            .eq('user_id', artist.user_id);
        }
      }
    }
  };

  // Toggle Ready status (Non-host players)
  const handleToggleReady = async () => {
    if (!room || !currentUserId) return;
    const me = players.find((p) => p.user_id === currentUserId);
    if (!me) return;

    await supabase
      .from('room_players')
      .update({ is_ready: !me.is_ready })
      .eq('room_id', room.id)
      .eq('user_id', currentUserId);

    await loadRoomData();
  };

  // Toggle Privacy status (Host only)
  const handleTogglePrivacy = async (isPrivate: boolean) => {
    if (!room) return;
    await supabase
      .from('rooms')
      .update({ is_private: isPrivate })
      .eq('id', room.id);

    setRoom((prev) => (prev ? { ...prev, is_private: isPrivate } : prev));
  };

  // Exit Room Handler with Auto-Cleanup of empty rooms
  const handleExitRoom = async () => {
    if (room && currentUserId) {
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', currentUserId);

      // Broadcast player left
      if (realtimeChannel) {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'player_left',
          payload: { userId: currentUserId },
        });
      }

      // Check remaining players
      const { data: remainingPlayers } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', room.id);

      if (!remainingPlayers || remainingPlayers.length === 0) {
        // Last player left -> auto delete room & votes from DB
        await supabase.from('votes').delete().eq('room_id', room.id);
        await supabase.from('rooms').delete().eq('id', room.id);
      }
    }
    router.push('/');
  };

  // Next Round Trigger
  const handleNextRound = async () => {
    if (!room) return;

    // Reset player ready states
    await supabase
      .from('room_players')
      .update({ is_ready: false })
      .eq('room_id', room.id);

    // Clear votes
    await supabase
      .from('votes')
      .delete()
      .eq('room_id', room.id);

    // Reset room state for next game
    await supabase
      .from('rooms')
      .update({
        status: 'lobby',
        secret_word: null,
        recap_image_url: null,
        winner: null,
        fake_player_id: null,
        current_turn_user_id: null,
        current_round: 1,
        turn_index: 0,
      })
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
      {/* Top Header with Exit Button & Room Info */}
      <div className="flex items-center justify-between p-3.5 glass-panel rounded-2xl border border-zinc-800 gap-3">
        <button
          onClick={handleExitRoom}
          className="py-2 px-3.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-xl text-xs font-bold text-red-300 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Выйти из комнаты
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">КОД:</span>
          <span className="font-mono font-black text-[#00f0ff] text-base px-2 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/30">
            #{room.code}
          </span>
        </div>
      </div>

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
          onToggleReady={handleToggleReady}
          onTogglePrivacy={handleTogglePrivacy}
        />
      )}

      {room.status === 'drawing' && (
        <DrawingCanvas
          isMyTurn={isMyTurn}
          activeDrawerNickname={activeDrawer?.nickname}
          realtimeChannel={realtimeChannel}
          userId={currentUserId || ''}
          initialImageUrl={room.recap_image_url}
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
