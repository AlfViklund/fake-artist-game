'use client';

import React from 'react';
import { Timer, AlertTriangle, Vote as VoteIcon, Eye, Sparkles } from 'lucide-react';
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
  secondsLeft = 60,
  onVote,
}: VotingPhaseProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(secondsLeft);

  // Find my own vote
  const myVote = votes.find((v) => v.voter_id === currentUserId);
  const hasVoted = !!myVote;

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (timeLeft === 0 && !hasVoted) {
      const selectable = players.filter((p) => p.user_id !== currentUserId);
      if (selectable.length > 0) {
        onVote(selectable[0].user_id);
      }
    }
  }, [timeLeft, hasVoted, players, currentUserId, onVote]);

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
          <Timer className="w-5 h-5 text-[#ff007f] animate-pulse" />
          <span className="font-mono text-xl font-bold text-[#ff007f]">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Instructions Banner */}
      {!hasVoted ? (
        <div className="p-3.5 text-center rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2 animate-pulse">
          <span>👇 Нажмите на имя или карточку игрока ниже, чтобы проголосовать против него!</span>
        </div>
      ) : (
        <div className="p-3.5 text-center rounded-xl bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66] text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2">
          <span>✓ Ваш голос принят! Ожидаем завершения голосования всеми игроками...</span>
        </div>
      )}

      {/* Canvas Masterpiece Recap Card */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase font-extrabold tracking-widest text-[#00f0ff]">ШЕДЕВР РАУНДА</span>
        <div className="glass-panel p-3.5 rounded-2xl border border-zinc-800 bg-[#07070e] flex items-center justify-center neon-glow-cyan min-h-[160px]">
          {room.recap_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={room.recap_image_url} 
              alt="Masterpiece recap" 
              className="max-h-[300px] w-auto max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
              <Sparkles className="w-8 h-8 text-[#00f0ff] animate-pulse" />
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-zinc-200">Совместный рисунок раунда</span>
              <span className="text-[11px] text-zinc-500 font-mono">Категория: {room.category || 'Игровой Холст'}</span>
            </div>
          )}
        </div>
      </div>

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
            const playerHasVoted = votes.some((v) => v.voter_id === player.user_id);

            return (
              <div key={player.id} className="flex flex-col gap-1.5">
                <PlayerCard
                  player={player}
                  showScore={false}
                  selectable={!hasVoted && !isSelf}
                  selected={isSelectedByMe}
                  statusText={playerHasVoted ? 'Проголосовал ✓' : 'Голосует...'}
                  onClick={() => !hasVoted && !isSelf && onVote(player.user_id)}
                />
                
                {/* Action button if selectable */}
                {!hasVoted && !isSelf && (
                  <button
                    onClick={() => onVote(player.user_id)}
                    className="w-full py-2 px-3 rounded-lg bg-pink-950/60 border border-pink-500/60 hover:bg-[#ff007f] hover:text-white text-[#ff007f] font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(255,0,127,0.2)]"
                  >
                    <VoteIcon className="w-3.5 h-3.5" />
                    Проголосовать за {player.nickname}
                  </button>
                )}

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
    </div>
  );
}

// Add a default export support
export { VotingPhase };
