// TypeScript interfaces and contracts for Fake Artist party game
// Stack: Next.js 16 (App Router), TypeScript, Supabase Realtime

/**
 * Game State Machine / Phase union
 */
export type GameStatus = 'lobby' | 'drawing' | 'voting' | 'fake_guess' | 'results';

/**
 * DB Entity: Room (rooms table)
 */
export interface Room {
  id: string;
  code: string;
  status: GameStatus;
  category: string | null;
  secret_word: string | null;
  fake_player_id: string | null;
  current_turn_user_id: string | null;
  turn_ends_at: string | null;
  current_round: number;
  max_rounds: number;
  created_at: string;
  
  // Frontend/virtual helper fields for matching legacy contracts
  turn_order?: string[];
  turn_index?: number;
  winner?: 'artists' | 'fake' | null;
  recap_image_url?: string | null;
}

/**
 * DB Entity: Room Player (room_players table)
 */
export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar_color: string | null;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
}

// Alias for Player to ensure compatibility with different imports
export type Player = RoomPlayer;

/**
 * DB Entity: Vote (votes table)
 */
export interface Vote {
  id: string;
  room_id: string;
  voter_id: string;
  suspect_id: string;
  created_at: string;
}

/**
 * Realtime Broadcast Payload for Drawing Stroke
 * Exact specification: { x, y, prevX, prevY, color, width, isEnd }
 */
export interface StrokePayload {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  width: number;
  isEnd: boolean;
}

/**
 * Realtime Broadcast Payload for Clearing Canvas
 */
export interface ClearPayload {
  userId: string;
}

/**
 * Realtime Broadcast Payload for Timers / Ticks
 */
export interface TimerPayload {
  secondsLeft: number;
}

/**
 * Realtime Broadcast Payload for Game State Synchronization
 */
export interface GameStateBroadcastPayload {
  room: Room;
  players: RoomPlayer[];
}

/**
 * Legacy Stroke contracts support for drawing component compatibility
 */
export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeData {
  userId: string;
  color: string;
  width: number;
  points: StrokePoint[];
  isEnd?: boolean;
}

/**
 * Word Bank Categories and Russian sample word lists
 */
export interface CategoryWords {
  id: string;
  name: string;
  icon: string;
  words: string[];
}

export const WORD_BANK: CategoryWords[] = [
  {
    id: 'space',
    name: 'Космос',
    icon: '🚀',
    words: [
      'Космическая собака', 'Черная дыра', 'Инопланетянин', 'Марсоход',
      'Ракета', 'Космический спутник', 'Астероид', 'Млечный путь',
      'Лазерный меч', 'Скафандр', 'Телескоп', 'НЛО'
    ],
  },
  {
    id: 'animals',
    name: 'Животные',
    icon: '🐱',
    words: [
      'Кенгуру в очках', 'Динозавр', 'Пингвин на скейте', 'Осьминог',
      'Жираф', 'Ленивец', 'Акула', 'Хамелеон', 'Фламинго',
      'Енот-ракун', 'Хомяк в шаре', 'Панда'
    ],
  },
  {
    id: 'food',
    name: 'Еда',
    icon: '🍕',
    words: [
      'Пицца', 'Суши-ролл', 'Гамбургер', 'Мороженое в рожке',
      'Коктейль с зонтиком', 'Тако', 'Пончик с глазурью', 'Авокадо',
      'Арбуз', 'Рамен', 'Кофе на вынос', 'Круассан'
    ],
  },
  {
    id: 'movies',
    name: 'Кино',
    icon: '🎬',
    words: [
      'Человек-паук', 'Гарри Поттер', 'Бэтмен', 'Шрек',
      'Миньон', 'Покемон Пикачу', 'Дарт Вейдер', 'Годзилла',
      'Губка Боб', 'Симпсоны', 'Соник', 'Супермен'
    ],
  },
  {
    id: 'it_tech',
    name: 'IT & Технологии',
    icon: '💻',
    words: [
      'Робот-пылесос', 'Игровой джойстик', 'Виртуальный шлем', 'Дрон',
      'Умные часы', 'Наушники', 'Серверная стойка', 'Майнинг-ферма',
      'Биткоин', 'Смартфон', 'Электросамокат', 'Кибер-рука'
    ],
  }
];
