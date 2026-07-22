'use client';

import React from 'react';
import { Shield, Sparkles, Paintbrush, Award } from 'lucide-react';
import { RoomPlayer } from '../types/game';

interface PlayerCardProps {
  player: RoomPlayer;
  isCurrentTurn?: boolean;
  isDrawing?: boolean;
  isMe?: boolean;
  showScore?: boolean;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export default function PlayerCard({
  player,
  isCurrentTurn = false,
  isDrawing = false,
  isMe = false,
  showScore = true,
  onClick,
  selectable = false,
  selected = false,
}: PlayerCardProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  // Cyberpunk border styles based on player role and status
  const cardBorderClass = () => {
    if (selected) {
      return 'border-[#ffe600] shadow-[0_0_15px_rgba(255,230,0,0.5)] ring-1 ring-[#ffe600]';
    }
    if (isCurrentTurn) {
      return 'border-[#ff007f] shadow-[0_0_12px_rgba(255,0,127,0.4)]';
    }
    if (isMe) {
      return 'border-[#00f0ff]/80 shadow-[0_0_10px_rgba(0,240,255,0.2)]';
    }
    return 'border-zinc-800 hover:border-zinc-700 hover:shadow-[0_0_8px_rgba(255,255,255,0.05)]';
  };

  return (
    <div
      onClick={selectable && onClick ? onClick : undefined}
      className={`glass-panel p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${cardBorderClass()} ${
        selectable ? 'cursor-pointer select-none active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-center gap-3.5">
        {/* Avatar with neon ring */}
        <div 
          className="relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg font-mono tracking-wider transition-all"
          style={{
            backgroundColor: `${player.avatar_color || '#ff007f'}15`,
            border: `2px solid ${player.avatar_color || '#ff007f'}`,
            boxShadow: `0 0 10px ${player.avatar_color || '#ff007f'}50`,
            color: player.avatar_color || undefined,
          } as React.CSSProperties}
        >
          {getInitials(player.nickname)}
          
          {/* Host star indicator */}
          {player.is_host && (
            <div 
              className="absolute -top-1.5 -left-1.5 p-0.5 rounded-md bg-yellow-500 text-black border border-black"
              title="Создатель комнаты"
            >
              <Shield className="w-3 h-3 fill-current" />
            </div>
          )}

          {/* Is ready slot */}
          {!showScore && (
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#07070e] ${
              player.is_ready ? 'bg-[#00ff66]' : 'bg-red-500'
            }`} />
          )}
        </div>

        {/* Player nickname & status info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold tracking-wide text-sm sm:text-base ${isMe ? 'text-[#00f0ff]' : 'text-zinc-100'}`}>
              {player.nickname}
            </span>
            {isMe && (
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded text-[#00f0ff]">
                ВЫ
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
            {isDrawing && (
              <span className="text-[10px] font-bold text-[#ff007f] flex items-center gap-1 uppercase tracking-wider animate-pulse">
                <Paintbrush className="w-3 h-3" /> РИСУЕТ...
              </span>
            )}
            {!isDrawing && isCurrentTurn && (
              <span className="text-[10px] font-bold text-[#00f0ff] flex items-center gap-1 uppercase tracking-wider animate-pulse">
                <Sparkles className="w-3 h-3" /> СЛЕДУЮЩИЙ
              </span>
            )}
            {!isDrawing && !isCurrentTurn && !showScore && (
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                player.is_ready ? 'text-[#00ff66]' : 'text-zinc-500'
              }`}>
                {player.is_ready ? 'Готов' : 'Думает...'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score or Selected indicator */}
      {showScore ? (
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-zinc-500">СЧЕТ</span>
          <div className="flex items-center gap-1 text-[#ffe600] font-mono font-bold text-lg">
            <Award className="w-4 h-4 text-[#ffe600]" />
            {player.score}
          </div>
        </div>
      ) : (
        selected && (
          <div className="w-6 h-6 rounded-full bg-[#ffe600] border border-[#ffe600] flex items-center justify-center text-black">
            <span className="font-bold text-xs">✓</span>
          </div>
        )
      )}
    </div>
  );
}
