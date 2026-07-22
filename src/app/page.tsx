'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Play, LogIn, Palette, ShieldAlert, Trophy } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate 6-letter room code
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setError('Пожалуйста, введите ваш никнейм');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Anonymous auth
      const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Не удалось получить ID пользователя');

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

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setError('Пожалуйста, введите ваш никнейм');
      return;
    }
    if (!roomCode.trim()) {
      setError('Пожалуйста, введите код комнаты');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanCode = roomCode.trim().toUpperCase();

    try {
      // 1. Find room
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select('id, code, status')
        .eq('code', cleanCode)
        .single();

      if (roomErr || !roomData) {
        throw new Error('Комната с таким кодом не найдена');
      }

      // 2. Anonymous auth
      const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Не удалось получить ID пользователя');

      // 3. Check if already in room
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('id')
        .eq('room_id', roomData.id)
        .eq('user_id', userId)
        .single();

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

      localStorage.setItem(`fake_artist_user_${cleanCode}`, JSON.stringify({ userId, nickname: nickname.trim() }));

      router.push(`/room/${cleanCode}`);
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
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-2/3 py-3 px-4 rounded-xl font-bold text-base bg-slate-900 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                ВОЙТИ В ИГРУ
              </button>
            </div>
          </div>
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
