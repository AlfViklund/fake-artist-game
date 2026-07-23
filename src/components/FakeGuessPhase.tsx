'use client';

import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, Send, ShieldAlert, CheckCircle } from 'lucide-react';
import { Room, RoomPlayer } from '../types/game';

interface FakeGuessPhaseProps {
  room: Room;
  players: RoomPlayer[];
  currentUserId: string;
  secondsLeft?: number;
  onSubmitGuess: (guessWord: string) => void;
}

export default function FakeGuessPhase({
  room,
  players,
  currentUserId,
  secondsLeft,
  onSubmitGuess,
}: FakeGuessPhaseProps) {
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(secondsLeft ?? 30);

  const fakePlayer = players.find((p) => p.user_id === room.fake_player_id);
  const isMeFake = room.fake_player_id === currentUserId;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !submitted && isMeFake) {
      setSubmitted(true);
      onSubmitGuess('');
    }
  }, [timeLeft, submitted, isMeFake, onSubmitGuess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || submitted) return;
    setSubmitted(true);
    onSubmitGuess(guess.trim());
  };

  const formatTime = (secs: number) => {
    if (secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full p-4">
      {/* Title Header with timer */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-950/40 border border-[#ffe600] flex items-center justify-center text-[#ffe600] neon-glow-pink">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-50 neon-text-pink">
              Красная Угроза: Угадывание!
            </h2>
            <p className="text-xs text-zinc-400">
              Фальшивый художник пойман за решетку!
            </p>
          </div>
        </div>

        {/* Pulsing Timer */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl self-start sm:self-center">
          <Timer className="w-5 h-5 text-[#ffe600] animate-pulse" />
          <span className="font-mono text-xl font-bold text-[#ffe600]">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Main interaction panels based on player roles */}
      {isMeFake ? (
        <div className="glass-panel p-6 rounded-2xl border border-[#ff007f] relative overflow-hidden bg-gradient-to-b from-zinc-900/60 to-[#ff007f]/5 shadow-[0_0_20px_rgba(255,0,127,0.15)] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#ff007f] leading-none mb-1">
              ТВОЙ ШАНС УБЕЖАТЬ
            </span>
            <h3 className="text-xl font-bold text-zinc-150">
              Тебя поймали! Угадай секретное слово.
            </h3>
            <p className="text-sm text-zinc-400">
              Если введешь правильное слово, ты и твоя банда хакеров выиграете раунд! Категория темы: <strong className="text-[#00f0ff]">{room.category || 'Своя категория'}</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              disabled={submitted}
              placeholder="Введи секретное слово..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-50 py-3 px-4 rounded-xl outline-none focus:border-[#ff007f] focus:shadow-[0_0_12px_rgba(255,0,127,0.3)] transition-all font-mono placeholder-zinc-700 disabled:opacity-40"
              autoFocus
            />
            
            <button
              type="submit"
              disabled={!guess.trim() || submitted}
              className="w-full py-3.5 rounded-xl bg-[#ff007f] border border-[#ff007f] text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(255,0,127,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitted ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Ответ отправлен...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить догадку
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col gap-5">
          <div className="flex flex-col gap-1 text-center py-4 items-center">
            <div className="w-12 h-12 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] flex items-center justify-center font-mono font-bold text-sm mb-3">
              {fakePlayer ? fakePlayer.nickname.slice(0, 2).toUpperCase() : '🤖'}
            </div>
            
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#00f0ff] leading-none mb-1">
              ЖДЕМ ОТВЕТА ОТ ФАЛЬШИВКИ
            </span>
            <h3 className="text-lg font-bold text-zinc-200">
              {fakePlayer?.nickname} взламывает шифр...
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mt-1">
              Художники поймали подозреваемого! Теперь он пытается угадать слово в категории <strong className="text-[#ffe600]">{room.category}</strong>.
            </p>
          </div>

          {/* Show the secret word to the real artist */}
          {room.secret_word && (
            <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl flex flex-col items-center gap-1 justify-center">
              <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-550">
                ВАШЕ СЕКРЕТНОЕ СЛОВО:
              </span>
              <span className="text-lg font-black font-mono tracking-wide text-[#00f0ff] neon-text-cyan uppercase">
                {room.secret_word}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { FakeGuessPhase };
