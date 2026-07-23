'use client';

import React, { useState } from 'react';
import { Copy, Check, Play, Settings, Users, Star, Dices, Globe, Lock } from 'lucide-react';
import { Room, RoomPlayer } from '../types/game';
import { WORD_BANK } from '../lib/wordBank';
import PlayerCard from './PlayerCard';

interface LobbyProps {
  room: Room;
  players: RoomPlayer[];
  currentUserId: string;
  onStartGame: (categoryId: string | null, customWord: string | null) => void;
  onToggleReady: () => void;
  onTogglePrivacy?: (isPrivate: boolean) => void;
}

export default function Lobby({
  room,
  players,
  currentUserId,
  onStartGame,
  onToggleReady,
  onTogglePrivacy,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('random');
  const [customWord, setCustomWord] = useState<string>('');
  const [showCustomWordInput, setShowCustomWordInput] = useState<boolean>(false);

  const me = players.find((p) => p.user_id === currentUserId);
  const isHost = me?.is_host ?? false;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const handleStartGameClick = () => {
    if (!isHost) return;
    
    const catId = selectedCategoryId === 'random' ? null : selectedCategoryId;
    const finalCustomWord = showCustomWordInput && customWord.trim() ? customWord.trim() : null;
    
    onStartGame(catId, finalCustomWord);
  };

  const canStart = players.length >= 2;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Room code banner */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Glow backdrop decorator */}
        <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full bg-[#00f0ff] opacity-10 blur-xl" />
        
        <div className="flex flex-col">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#00f0ff] leading-none mb-1">КОД КОМНАТЫ</span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black font-mono tracking-widest text-zinc-50 neon-text-cyan">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-[#00f0ff] hover:border-[#00f0ff] hover:shadow-[0_0_8px_rgba(0,240,255,0.2)] transition-all cursor-pointer"
              title="Скопировать код"
            >
              {copied ? <Check className="w-5 h-5 text-[#00ff66]" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Players count badge */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 py-2.5 px-4 rounded-xl">
          <Users className="w-5 h-5 text-[#ff007f]" />
          <span className="text-zinc-200 font-semibold">{players.length} игроков в лобби</span>
        </div>
      </div>

      {/* Host Configuration Panel */}
      {isHost ? (
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-[#ff007f] font-semibold text-base">
            <Settings className="w-5 h-5" />
            <h3 className="tracking-wide uppercase text-sm font-bold">НАСТРОЙКИ СЕССИИ (ДЛЯ ХОСТА)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase font-extrabold tracking-wider text-zinc-500">Категория</label>
              <select
                disabled={showCustomWordInput}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 py-2.5 px-3.5 rounded-xl outline-none focus:border-[#ff007f] focus:shadow-[0_0_10px_rgba(255,0,127,0.2)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="random">🎲 Случайная категория</option>
                {WORD_BANK.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode: Random vs Custom word */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase font-extrabold tracking-wider text-zinc-500">Тип Игры</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomWordInput(false);
                    setCustomWord('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                    !showCustomWordInput
                      ? 'bg-[#ff007f]/10 border-[#ff007f] text-[#ff007f] shadow-[0_0_8px_rgba(255,0,127,0.15)]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Из Банка Слов
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomWordInput(true)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                    showCustomWordInput
                      ? 'bg-[#ff007f]/10 border-[#ff007f] text-[#ff007f] shadow-[0_0_8px_rgba(255,0,127,0.15)]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Своё Слово
                </button>
              </div>
            </div>
          </div>

          {/* Custom Word details */}
          {showCustomWordInput && (
            <div className="flex flex-col gap-1.5 mt-2 animate-fadeIn">
              <label className="text-xs uppercase font-extrabold tracking-wider text-zinc-500">Загаданное Слово</label>
              <input
                type="text"
                placeholder="Например: Робот-пылесос..."
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-100 py-2.5 px-3.5 rounded-xl outline-none focus:border-[#ff007f] focus:shadow-[0_0_10px_rgba(255,0,127,0.2)] transition-all font-mono"
              />
              <p className="text-[10px] text-zinc-500 italic mt-0.5">
                Вы загадываете слово самостоятельно. Игрокам с ролью Художник покажется это слово, фальшивый художник получит надпись "Категория: Своё Слово".
              </p>
            </div>
          )}

          {/* Access control mode: Open vs Private */}
          <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-zinc-800/80">
            <label className="text-xs uppercase font-extrabold tracking-wider text-zinc-500">Доступ к Комнате</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onTogglePrivacy?.(false)}
                className={`flex-1 py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !room.is_private
                    ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Открытая (В списке)</span>
              </button>
              <button
                type="button"
                onClick={() => onTogglePrivacy?.(true)}
                className={`flex-1 py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  room.is_private
                    ? 'bg-amber-950/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>🔒 Закрытая (Только по коду)</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 italic mt-0.5">
              {!room.is_private
                ? 'Открытая комната отображается в списке доступных игр на главной странице.'
                : 'Приватная комната скрыта из общего списка. Вход доступен только по коду.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <span className="animate-ping w-2 h-2 rounded-full bg-[#00f0ff] inline-block mr-1"></span>
            Ожидание запуска игры создателем комнаты...
          </div>
          <button
            onClick={onToggleReady}
            className={`py-2 px-5 rounded-xl border font-bold text-sm tracking-wide transition-all ${
              me?.is_ready
                ? 'bg-[#00ff66]/10 border-[#00ff66] text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {me?.is_ready ? 'ГОТОВ ✓' : 'ГОТОВ?'}
          </button>
        </div>
      )}

      {/* Players grid list */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 flex items-center gap-2">
          <span>СВЯЗАННЫЕ ИГРОКИ</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f]" />
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isMe={player.user_id === currentUserId}
              showScore={false}
            />
          ))}
        </div>
      </div>

      {/* Action CTA Start Button */}
      {isHost && (
        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleStartGameClick}
            disabled={!canStart}
            className={`w-full py-4 rounded-2xl border text-base font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              canStart
                ? 'bg-[#ff007f] border-[#ff007f] text-white cursor-pointer hover:shadow-[0_0_20px_rgba(255,0,127,0.6)] hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-650 cursor-not-allowed opacity-60'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            Запустить сессию
          </button>
          {!canStart && (
            <span className="text-xs text-center text-red-500/80 font-bold uppercase tracking-wider">
              Для игры необходимо минимум 2 игрока
            </span>
          )}
        </div>
      )}
    </div>
  );
};
