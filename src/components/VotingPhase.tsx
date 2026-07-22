'use client';

import React from 'react';
import { Timer, AlertTriangle, Vote as VoteIcon, Eye } from 'lucide-react';
import { Room, RoomPlayer, Vote } from '../types/game';
import PlayerCard from './PlayerCard';

interface VotingPhaseProps {
  room: Room;
  players: RoomPlayer[];
  votes: Vote[];
  currentUserId: string;
  secondsLeft?: number;
  onVote: (suspectId: string) => void;
}

export default function VotingPhase({
  room,
  players,
  votes,
  currentUserId,
  secondsLeft,
  onVote,
}: VotingPhaseProps) {
  // Find my own vote
  const myVote = votes.find((v) => v.voter_id === currentUserId);

  // Group votes by suspect user_id
  const voteMap = votes.reduce((acc, vote) => {
    acc[vote.suspect_id] = (acc[vote.suspect_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get voters for each public player card
  const getVotersForPlayer = (targetPlayerUserId: string) => {
    return votes
      .filter((v) => v.suspect_id === targetPlayerUserId)
      .map((v) => players.find((p) => p.user_id === v.voter_id))
      .filter((p): p is RoomPlayer => !!p);
  };

  // Check if current user has already voted
  const hasVoted = !!myVote;

  // Format countdown seconds
  const formatTime = (secs: number) => {
    if (secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full p-4">
      {/* Title Header with Timer */}
      <div className="glass-panel p-5 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-950/40 border border-[#ff007f] flex items-center justify-center text-[#ff007f] neon-glow-pink">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-50 neon-text-pink">
              Голосование за Фальшивку!
            </h2>
            <p className="text-xs text-zinc-400">
              Кто не знал секретного слова и рисовал наугад?
            </p>
          </div>
        </div>

        {/* Pulsing Timer */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl self-start sm:self-center">
          <Timer className="w-5 h-5 text-[#ffe600] animate-pulse" />
          <span className="font-mono text-xl font-bold text-[#ffe600]">
            {formatTime(secondsLeft ?? 60)}
          </span>
        </div>
      </div>

      {/* Canvas Masterpiece Recap Card */}
      {room.recap_image_url ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#00f0ff]">ШЕДЕВР РАУНДА</span>
          <div className="glass-panel p-3 rounded-2xl border border-zinc-800 overflow-hidden bg-[#07070e] flex items-center justify-center neon-glow-cyan">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img 
               src={room.recap_image_url} 
               alt="Masterpiece recap" 
               className="max-h-[300px] w-auto max-w-full rounded-lg object-contain"
             />
          </div>
        </div>
      ) : (
        <div className="glass-panel p-10 rounded-2xl border border-zinc-800 text-center flex flex-col items-center justify-center text-zinc-500 gap-2">
          <Eye className="w-8 h-8 text-zinc-650" />
          <span className="text-sm font-semibold">Изображение холста в режиме рендеринга...</span>
        </div>
      )}

      {/* Suspect Player Cards Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
            ВЫБЕРИТЕ ПОДОЗРЕВАЕМОГО:
          </h4>
          <span className="text-xs text-[#00f0ff] font-mono">
            {votes.length} / {players.length} проголосовало
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((player) => {
            const isSelf = player.user_id === currentUserId;
            const voteCount = voteMap[player.user_id] || 0;
            const voters = getVotersForPlayer(player.user_id);
            const isSelectedByMe = myVote?.suspect_id === player.user_id;

            return (
              <div key={player.id} className="flex flex-col gap-1.5">
                <PlayerCard
                  player={player}
                  showScore={false}
                  selectable={!hasVoted && !isSelf}
                  selected={isSelectedByMe}
                  onClick={() => !hasVoted && !isSelf && onVote(player.user_id)}
                />
                
                {/* Vote tallies & user initials list below card */}
                {votes.length > 0 && (
                  <div className="flex items-center justify-between px-2 text-xs">
                    <span className="text-zinc-500 flex items-center gap-1 font-mono">
                      <VoteIcon className="w-3.5 h-3.5 text-zinc-550" />
                      Голоса: <strong className="text-zinc-300">{voteCount}</strong>
                    </span>
                    
                    {voters.length > 0 && (
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {voters.map((voter) => (
                          <div
                            key={voter.id}
                            className="w-5 h-5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] tracking-tighter"
                            style={{
                              backgroundColor: voter.avatar_color || '#ff007f',
                              color: '#000000',
                            }}
                            title={`${voter.nickname} считает этого игрока фейком`}
                          >
                            {voter.nickname.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Help Banner status */}
      {hasVoted && (
        <div className="p-3 text-center rounded-xl bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66] text-sm font-semibold tracking-wide animate-pulse">
          Твой голос записан! Ждем остальных игроков...
        </div>
      )}
    </div>
  );
}

// Add a default export support
export { VotingPhase };
