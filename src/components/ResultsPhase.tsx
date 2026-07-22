'use client';

import React, { useEffect } from 'react';
import { Room, RoomPlayer } from '@/types/game';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Sparkles, UserX } from 'lucide-react';

interface ResultsPhaseProps {
  room: Room;
  players: RoomPlayer[];
  currentUserId: string;
  isHost: boolean;
  onNextRound: () => void;
}

export const ResultsPhase: React.FC<ResultsPhaseProps> = ({
  room,
  players,
  currentUserId,
  isHost,
  onNextRound,
}) => {
  const fakePlayer = players.find((p) => p.user_id === room.fake_player_id);
  const isFakeWinner = room.winner === 'fake';

  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: isFakeWinner ? ['#ffe600', '#ff007f', '#a855f7'] : ['#00f0ff', '#00ff66', '#ff007f'],
      });
    } catch {
      // ignore
    }
  }, [isFakeWinner]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full p-4">
      <div
        className={`flex flex-col items-center justify-center p-8 glass-panel rounded-2xl border text-center gap-3 ${
          isFakeWinner
            ? 'border-amber-500/60 bg-amber-950/20 neon-glow-pink'
            : 'border-emerald-500/60 bg-emerald-950/20 neon-glow-cyan'
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-white/20 shadow-xl mb-1">
          <Trophy className={`w-8 h-8 ${isFakeWinner ? 'text-amber-400' : 'text-emerald-400'}`} />
        </div>

        <h2
          className={`text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${
            isFakeWinner
              ? 'from-amber-400 via-pink-500 to-red-500'
              : 'from-emerald-400 via-cyan-400 to-pink-500'
          }`}
        >
          {isFakeWinner ? 'ПОБЕДА ФЕЙКА!' : 'ПОБЕДА ХУДОЖНИКОВ!'}
        </h2>

        <p className="text-slate-300 text-sm font-medium">
          {isFakeWinner
            ? 'Фейку удалось обмануть всех или угадать секретное слово!'
            : 'Художники вычислили Фейка и защитили секретное слово!'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 glass-panel rounded-2xl border border-slate-800">
        <div className="flex flex-col gap-1 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">Секретное Слово</span>
          <span className="text-xl font-black text-pink-400 font-mono">{room.secret_word || '—'}</span>
          <span className="text-xs text-slate-500">Категория: {room.category}</span>
        </div>

        <div className="flex flex-col gap-1 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">Фейковый Художник</span>
          <div className="flex items-center gap-2 mt-1">
            <UserX className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-black text-amber-300 font-mono">
              {fakePlayer?.nickname || 'Неизвестный'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2 px-1">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Таблица Лидеров
        </h3>

        <div className="flex flex-col gap-2">
          {players
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 glass-panel rounded-xl border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-500 text-sm w-4">#{idx + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs"
                    style={{ backgroundColor: p.avatar_color || '#ff007f' }}
                  >
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-100">{p.nickname}</span>
                  {p.user_id === room.fake_player_id && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-400 font-mono">
                      Фейк
                    </span>
                  )}
                </div>

                <span className="font-mono font-bold text-cyan-300 text-base">
                  {p.score} очков
                </span>
              </div>
            ))}
        </div>
      </div>

      {isHost && (
        <button
          onClick={onNextRound}
          className="mt-4 w-full py-4 px-6 rounded-xl font-black text-lg bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 text-white shadow-lg neon-glow-pink hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          СЛЕДУЮЩИЙ РАУНД
        </button>
      )}
    </div>
  );
};

export default ResultsPhase;
