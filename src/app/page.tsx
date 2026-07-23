'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Play, LogIn, Palette, ShieldAlert, Trophy, Globe, Users, Lock, ArrowRight } from 'lucide-react';

interface OpenRoomItem {
  id: string;
  code: string;
  category: string | null;
  created_at: string;
  player_count: number;
  host_nickname: string;
}

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openRooms, setOpenRooms] = useState<OpenRoomItem[]>([]);
  const [openRoomsLoading, setOpenRoomsLoading] = useState(true);

  // Generate 6-letter room code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getOrCreateGuestUserId = () => {
    let userId = localStorage.getItem('fake_artist_guest_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('fake_artist_guest_id', userId);
    }
    return userId;
  };

  // Fetch open public rooms & auto-clean empty/stale rooms
  const fetchOpenRooms = useCallback(async () => {
    try {
      // 2 hours age threshold
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Clean up old rooms created > 2 hours ago
      await supabase.from('rooms').delete().lt('created_at', twoHoursAgo);

      const { data: roomsData, error: roomsErr } = await supabase
        .from('rooms')
        .select('id, code, category, created_at')
        .eq('status', 'lobby')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(12);

      if (roomsErr || !roomsData) {
        setOpenRooms([]);
        return;
      }

      const activeRooms: OpenRoomItem[] = [];

      await Promise.all(
        roomsData.map(async (r) => {
          const { data: playersData } = await supabase
            .from('room_players')
            .select('nickname, is_host')
            .eq('room_id', r.id);

          const players = playersData || [];
          if (players.length === 0) {
            // Auto delete empty ghost room from DB
            await supabase.from('rooms').delete().eq('id', r.id);
          } else {
            const host = players.find((p) => p.is_host)?.nickname || 'Игрок';
            activeRooms.push({
              id: r.id,
              code: r.code,
              category: r.category,
              created_at: r.created_at,
              player_count: players.length,
              host_nickname: host,
            });
          }
        })
      );

      // Sort by newest created_at
      activeRooms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOpenRooms(activeRooms.slice(0, 6));
    } catch (err) {
      console.error('Failed to fetch open rooms:', err);
    } finally {
      setOpenRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenRooms();

    const channel = supabase
      .channel('public_open_rooms_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchOpenRooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => {
        fetchOpenRooms();
      })
      .subscribe();

    const interval = setInterval(fetchOpenRooms, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOpenRooms]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('Пожалуйста, введите ваш никнейм');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Guest user ID
      const userId = getOrCreateGuestUserId();
      const code = generateCode();

      // 2. Create room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code,
          status: 'lobby',
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // 3. Add host player
      const colors = ['#ff007f', '#00f0ff', '#ffe600', '#00ff66', '#a855f7'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      const { error: playerErr } = await supabase.from('room_players').insert({
        room_id: roomData.id,
        user_id: userId,
        nickname: nickname.trim(),
        avatar_color: avatarColor,
        is_host: true,
      });

      if (playerErr) throw playerErr;

      // Store local session info
      localStorage.setItem(`fake_artist_user_${code}`, JSON.stringify({ userId, nickname: nickname.trim() }));

      router.push(`/room/${code}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка при создании комнаты');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (codeOverride?: string) => {
    const targetCode = (codeOverride || roomCode).trim().toUpperCase();

    if (!nickname.trim()) {
      setError('Пожалуйста, введите ваш никнейм');
      return;
    }
    if (!targetCode) {
      setError('Пожалуйста, введите код комнаты');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Find room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('id, code, status')
        .eq('code', targetCode)
        .maybeSingle();

      if (roomErr || !roomData) {
        throw new Error('Комната не найдена');
      }

      // 2. Guest user ID
      const userId = getOrCreateGuestUserId();

      // 3. Check if already in room
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingPlayer) {
        const colors = ['#ff007f', '#00f0ff', '#ffe600', '#00ff66', '#a855f7'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        const { error: joinErr } = await supabase.from('room_players').insert({
          room_id: roomData.id,
          user_id: userId,
          nickname: nickname.trim(),
          avatar_color: avatarColor,
          is_host: false,
        });

        if (joinErr) throw joinErr;
      }

      localStorage.setItem(`fake_artist_user_${targetCode}`, JSON.stringify({ userId, nickname: nickname.trim() }));

      router.push(`/room/${targetCode}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ошибка при входе в комнату');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg flex flex-col gap-8 relative z-10">
        {/* Title */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-pink-500/30 text-xs font-mono text-pink-400 mb-2">
            <Sparkles className="w-4 h-4" /> PARTY GAME FOR FRIENDS
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 tracking-wider">
            ФАБРИКА ФЕЙКОВ
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-md">
            Один рисует наугад. Остальные защищают секретное слово. Сможете вычислить самозванца?
          </p>
        </div>

        {/* Action Card */}
        <div className="p-6 md:p-8 glass-panel rounded-3xl border border-pink-500/30 neon-glow-pink flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs text-center font-semibold">
              {error}
            </div>
          )}

          {/* Nickname input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Ваш Никнейм
            </label>
            <input
              type="text"
              placeholder="Например: Нео_2077"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl p-4 font-bold text-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30 outline-none transition-all"
              maxLength={16}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl font-black text-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg neon-glow-pink hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              СОЗДАТЬ НОВУЮ КОМНАТУ
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-xs font-mono text-slate-500 uppercase">или войти по коду</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="КОД"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-1/3 bg-slate-950/80 border border-slate-700 text-cyan-300 text-center font-mono font-black text-xl rounded-xl p-3 focus:border-cyan-400 outline-none tracking-widest uppercase"
                maxLength={6}
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={loading}
                className="w-2/3 py-3 px-4 rounded-xl font-bold text-base bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                ВОЙТИ В ИГРУ
              </button>
            </div>
          </div>
        </div>

        {/* Open Rooms List */}
        <div className="p-4 sm:p-6 glass-panel rounded-3xl border border-cyan-500/30 neon-glow-cyan flex flex-col gap-3.5 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm tracking-wider uppercase">
              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>ОТКРЫТЫЕ КОМНАТЫ</span>
              <span className="flex h-2 w-2 relative ml-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline shrink-0">Авто-обновление ⚡️</span>
          </div>

          {openRoomsLoading ? (
            <div className="py-6 flex justify-center items-center gap-2 text-xs font-mono text-slate-500">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              Поиск открытых сессий...
            </div>
          ) : openRooms.length === 0 ? (
            <div className="py-6 px-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-center flex flex-col items-center gap-1.5">
              <Users className="w-6 h-6 text-slate-600 mb-0.5" />
              <span className="text-xs font-bold text-slate-400">Сейчас нет открытых комнат</span>
              <span className="text-[11px] text-slate-500 max-w-xs">
                Создайте первую комнату выше — она появится в списке, и друзья смогут войти!
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {openRooms.map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl flex items-center justify-between gap-2 transition-all group overflow-hidden"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className="font-mono font-black text-cyan-400 text-xs px-2 py-1 rounded-lg bg-cyan-950/50 border border-cyan-800/40 shrink-0">
                      #{r.code}
                    </span>
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate max-w-[110px] xs:max-w-[140px] sm:max-w-none">
                        Хост: {r.host_nickname}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[110px] xs:max-w-[140px] sm:max-w-none">
                        {r.category ? `Тема: ${r.category}` : 'Случайная тема'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3 text-pink-400" />
                      {r.player_count}
                    </span>

                    <button
                      data-code={r.code}
                      onClick={() => handleJoinRoom(r.code)}
                      disabled={loading}
                      className="py-1 px-2.5 sm:px-3 rounded-xl text-xs font-extrabold bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-black active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <span>ВОЙТИ</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Rules */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 glass-panel rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Palette className="w-5 h-5 text-pink-400" />
            <span className="text-[11px] font-bold text-slate-300">1 Штрих</span>
            <span className="text-[10px] text-slate-500">Рисуем по очереди</span>
          </div>

          <div className="p-3 glass-panel rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-300">Фейк в игре</span>
            <span className="text-[10px] text-slate-500">Знает только категорию</span>
          </div>

          <div className="p-3 glass-panel rounded-xl border border-slate-800 flex flex-col items-center gap-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-300">Победа</span>
            <span className="text-[10px] text-slate-500">Вычислите или угадайте</span>
          </div>
        </div>
      </div>
    </main>
  );
}
