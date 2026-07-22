'use client';

import React, { useRef, useState, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Paintbrush, Eraser, Trash2, Download, Check } from 'lucide-react';
import { StrokeData, StrokePoint } from '../types/game';

interface DrawingCanvasProps {
  isMyTurn: boolean;
  activeDrawerNickname?: string;
  onBroadcastStroke?: (stroke: StrokeData) => void;
  onStrokeComplete?: (stroke: StrokeData, dataUrl?: string) => void;
  onBroadcastClear?: () => void;
  realtimeChannel: RealtimeChannel | null;
  userId?: string;
  initialImageUrl?: string | null;
  onSaveImage?: (dataUrl: string) => void;
}

const NEON_COLORS = [
  { name: 'Hot Pink', hex: '#ff007f' },
  { name: 'Neon Cyan', hex: '#00f0ff' },
  { name: 'Neon Yellow', hex: '#ffe600' },
  { name: 'Neon Green', hex: '#00ff66' },
  { name: 'Neon Purple', hex: '#a855f7' },
  { name: 'Neon Blue', hex: '#0066ff' },
  { name: 'Neon Orange', hex: '#ff5500' },
  { name: 'Neon Red', hex: '#ff0033' },
];

const CANVAS_BG = '#07070e';

export default function DrawingCanvas({
  isMyTurn,
  activeDrawerNickname,
  onBroadcastStroke,
  onStrokeComplete,
  onBroadcastClear,
  realtimeChannel,
  userId,
  initialImageUrl,
  onSaveImage,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokePointsRef = useRef<StrokePoint[]>([]);

  const [selectedColor, setSelectedColor] = useState<string>(NEON_COLORS[0].hex);
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  // Resize canvas to parent bounds and preserve retina scaling
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Read current content if it exists
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    let hasContent = false;
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
      hasContent = true;
    }

    // Update dimensions
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Redraw background
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // If we had content, scale and draw it back
    if (hasContent && tempCanvas.width > 0 && tempCanvas.height > 0) {
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr, 0, 0, rect.width, rect.height);
    }
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);

  // Load background recap image if provided (for persistence across turns and reconnects)
  useEffect(() => {
    if (!initialImageUrl || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = initialImageUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  }, [initialImageUrl]);

  // Sync incoming realtime strokes and clear events
  useEffect(() => {
    if (!realtimeChannel) return;

    realtimeChannel
      .on('broadcast', { event: 'draw_stroke' }, (event: any) => {
        const stroke: StrokeData = event.payload;
        if (stroke && stroke.userId !== userId) {
          drawRemoteStroke(stroke);
        }
      })
      .on('broadcast', { event: 'clear_canvas' }, (event: any) => {
        if (event.payload?.userId !== userId) {
          clearLocalCanvas(false);
        }
      });
  }, [realtimeChannel, userId]);

  // Draw remote stroke using absolute pixel calculations based on modern relative bounds
  const drawRemoteStroke = (stroke: StrokeData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const points = stroke.points;
    if (points.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Setup neon glow effect for neon brush
    if (stroke.color !== CANVAS_BG) {
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.width * 1.5;
    }

    const startX = points[0].x * rect.width;
    const startY = points[0].y * rect.height;

    if (points.length === 1) {
      ctx.arc(startX, startY, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.moveTo(startX, startY);
      for (let i = 1; i < points.length; i++) {
        const pX = points[i].x * rect.width;
        const pY = points[i].y * rect.height;
        ctx.lineTo(pX, pY);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Clamp coordinates boundary [0, 1]
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isMyTurn) return;
    isDrawingRef.current = true;

    const coords = getRelativeCoords(e);
    if (!coords) return;

    currentStrokePointsRef.current = [coords];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const color = isEraser ? CANVAS_BG : selectedColor;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Local glowing effect
    if (!isEraser) {
      ctx.shadowColor = color;
      ctx.shadowBlur = brushSize * 1.5;
    }

    ctx.moveTo(coords.x * rect.width, coords.y * rect.height);
    // Draw a single dot
    ctx.lineTo(coords.x * rect.width, coords.y * rect.height);
    ctx.stroke();
    ctx.restore();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isMyTurn) return;

    const coords = getRelativeCoords(e);
    if (!coords) return;

    const prevPoints = currentStrokePointsRef.current;
    if (prevPoints.length === 0) return;

    const lastPoint = prevPoints[prevPoints.length - 1];
    
    // Throttle or filter identical points to save bandwidth
    if (Math.abs(lastPoint.x - coords.x) < 0.001 && Math.abs(lastPoint.y - coords.y) < 0.001) {
      return;
    }

    currentStrokePointsRef.current.push(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const color = isEraser ? CANVAS_BG : selectedColor;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isEraser) {
      ctx.shadowColor = color;
      ctx.shadowBlur = brushSize * 1.5;
    }

    ctx.moveTo(lastPoint.x * rect.width, lastPoint.y * rect.height);
    ctx.lineTo(coords.x * rect.width, coords.y * rect.height);
    ctx.stroke();
    ctx.restore();

    // Broadcast live intermediate segments to keep drawing responsive for other players
    if (realtimeChannel && currentStrokePointsRef.current.length % 2 === 0) {
      const strokeSegment: StrokeData = {
        userId: userId || 'anon',
        color,
        width: brushSize,
        points: currentStrokePointsRef.current.slice(-4),
        isEnd: false,
      };
      realtimeChannel.send({
        type: 'broadcast',
        event: 'draw_stroke',
        payload: strokeSegment,
      });
      onBroadcastStroke?.(strokeSegment);
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokePointsRef.current.length > 0) {
      const stroke: StrokeData = {
        userId: userId || 'anon',
        color: isEraser ? CANVAS_BG : selectedColor,
        width: brushSize,
        points: currentStrokePointsRef.current,
        isEnd: true,
      };
      if (realtimeChannel) {
        realtimeChannel.send({
          type: 'broadcast',
          event: 'draw_stroke',
          payload: stroke,
        });
      }
      const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;
      onBroadcastStroke?.(stroke);
      onStrokeComplete?.(stroke, dataUrl);
      
      // Auto trigger parent callback with latest canvas data URL on turn ends
      triggerSaveCallback();
    }
  };

  const clearLocalCanvas = (shouldBroadcast = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    currentStrokePointsRef.current = [];

    if (shouldBroadcast && realtimeChannel) {
      realtimeChannel.send({
        type: 'broadcast',
        event: 'clear_canvas',
        payload: { userId: userId || 'anon' },
      });
      onBroadcastClear?.();
    }
  };

  const triggerSaveCallback = () => {
    if (onSaveImage && canvasRef.current) {
      onSaveImage(canvasRef.current.toDataURL('image/png'));
    }
  };

  const triggerManualSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      if (onSaveImage) onSaveImage(dataUrl);

      // Trigger standard browser download for convenience
      const link = document.createElement('a');
      link.download = `fake-artist-masterpiece-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-4">
      {/* Shared Canvas Explanation Hint */}
      <div className="px-4 py-2.5 rounded-xl bg-cyan-950/30 border border-[#00f0ff]/30 text-[#00f0ff] text-xs font-semibold flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          🎨 <strong>ОБЩИЙ ХОЛСТ:</strong> Все игроки рисуют на ЕДИНОМ рисунке в реальном времени!
        </span>
        <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">У вас 1 линия за ход</span>
      </div>

      {/* Turn Indicator Banner */}
      <div className={`p-3 rounded-lg border text-center transition-all ${
        isMyTurn 
          ? 'bg-pink-950/40 border-[#ff007f] text-pink-400 neon-glow-pink animate-pulse' 
          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
      }`}>
        <h3 className="font-semibold tracking-wider text-sm sm:text-base">
          {isMyTurn ? '🚨 ТВОЙ ХОД! НАРИСУЙ ОДНУ ЛИНИЮ 🚨' : 'ПОДОЖДИ... ДРУГОЙ ИГРОК РИСУЕТ'}
        </h3>
      </div>

      {/* Canvas Wrapper */}
      <div 
        ref={containerRef} 
        className="relative flex-1 aspect-[4/3] w-full rounded-xl border border-zinc-800 overflow-hidden bg-[#07070e] neon-glow-cyan"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 block touch-none cursor-crosshair"
        />
        {!isMyTurn && (
          <div className="absolute inset-0 bg-transparent" />
        )}
      </div>

      {/* Palette and Draw tools */}
      <div className="glass-panel p-4 rounded-xl border border-zinc-800 flex flex-col gap-4">
        {/* Colors Picker */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest">ЦВЕТ НЕОНА</span>
          <div className="flex flex-wrap gap-2.5">
            {NEON_COLORS.map((c) => (
              <button
                key={c.hex}
                disabled={!isMyTurn}
                onClick={() => {
                  setSelectedColor(c.hex);
                  setIsEraser(false);
                }}
                className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                  !isMyTurn 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:scale-110 active:scale-95 cursor-pointer'
                } ${
                  selectedColor === c.hex && !isEraser
                    ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-black'
                    : 'border-transparent'
                }`}
                style={{
                  backgroundColor: c.hex,
                  boxShadow: `0 0 10px ${c.hex}80`,
                }}
                title={c.name}
              >
                {selectedColor === c.hex && !isEraser && (
                  <Check className="absolute inset-0 m-auto text-black w-4 h-4 stroke-[3]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Brush config & Action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800/80 pt-4">
          {/* Slider for brush size */}
          <div className="flex flex-1 items-center gap-3">
            <span className="text-xs uppercase text-zinc-500 font-bold tracking-widest min-w-[70px]">РАЗМЕР КИСТИ</span>
            <input
              type="range"
              min="2"
              max="15"
              value={brushSize}
              disabled={!isMyTurn}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="flex-1 accent-[#00f0ff] bg-zinc-850 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-semibold font-mono text-[#00f0ff] w-6 text-right">
              {brushSize}px
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Eraser */}
            <button
              onClick={() => setIsEraser(!isEraser)}
              disabled={!isMyTurn}
              className={`p-2.5 rounded-lg border text-sm flex items-center gap-1.5 font-bold transition-all ${
                !isMyTurn 
                  ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-600' 
                  : isEraser 
                    ? 'bg-[#ffe600] border-[#ffe600] text-black shadow-[0_0_12px_rgba(255,230,0,0.4)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
              title="Ластик"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden xs:inline">Ластик</span>
            </button>

            {/* Clear canvas */}
            <button
              onClick={() => clearLocalCanvas(true)}
              disabled={!isMyTurn}
              className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-red-500/50 hover:text-red-400 text-sm flex items-center gap-1.5 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Очистить"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden xs:inline">Очистить</span>
            </button>

            {/* Export / Download */}
            <button
              onClick={triggerManualSave}
              className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-[#00f0ff]/50 hover:text-[#00f0ff] hover:shadow-[0_0_10px_rgba(0,240,255,0.2)] text-sm flex items-center gap-1.5 font-bold transition-all"
              title="Скачать шедевр"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Скачать</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
