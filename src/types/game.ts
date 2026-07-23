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
      'Лазерный меч', 'Скафандр', 'Телескоп', 'НЛО',
      'Солнечное затмение', 'Метеоритный дождь', 'Галактический крейсер',
      'Кольца Сатурна', 'Космическая станция', 'Луноход', 'Комета', 'Звездная пыль'
    ],
  },
  {
    id: 'animals',
    name: 'Животные',
    icon: '🐱',
    words: [
      'Кенгуру в очках', 'Динозавр', 'Пингвин на скейте', 'Осьминог',
      'Жираф', 'Ленивец', 'Акула', 'Хамелеон', 'Фламинго',
      'Енот-ракун', 'Хомяк в шаре', 'Панда',
      'Белый медведь', 'Сова-детектив', 'Утконос', 'Хаски',
      'Летучая мышь', 'Коала на эвкалипте', 'Олень с рогами', 'Дельфин'
    ],
  },
  {
    id: 'food',
    name: 'Еда & Напитки',
    icon: '🍕',
    words: [
      'Пицца', 'Суши-ролл', 'Гамбургер', 'Мороженое в рожке',
      'Коктейль с зонтиком', 'Тако', 'Пончик с глазурью', 'Авокадо',
      'Арбуз', 'Рамен', 'Кофе на вынос', 'Круассан',
      'Пельмени со сметаной', 'Борщ в тарелке', 'Чизкейк', 'Попкорн',
      'Вафли с сиропом', 'Блины с икрой', 'Спагетти с фрикадельками', 'Шашлык'
    ],
  },
  {
    id: 'movies',
    name: 'Кино & Мультфильмы',
    icon: '🎬',
    words: [
      'Человек-паук', 'Гарри Поттер', 'Бэтмен', 'Шрек',
      'Миньон', 'Покемон Пикачу', 'Дарт Вейдер', 'Годзилла',
      'Губка Боб', 'Симпсоны', 'Соник', 'Супермен',
      'Джек Воробей', 'Шерлок Холмс', 'ВАЛЛ-И', 'Немо',
      'Матрица Нео', 'Терминатор', 'Кунг-фу Панда', 'Джинн из Аладдина'
    ],
  },
  {
    id: 'it_tech',
    name: 'IT & Технологии',
    icon: '💻',
    words: [
      'Робот-пылесос', 'Игровой джойстик', 'Виртуальный шлем', 'Дрон',
      'Умные часы', 'Наушники', 'Серверная стойка', 'Майнинг-ферма',
      'Биткоин', 'Смартфон', 'Электросамокат', 'Кибер-рука',
      'ИИ-андроид', 'Материнская плата', 'Wi-Fi роутер', '3D-принтер',
      'Флешка-трансформер', 'Умная колонка', 'Квантовый компьютер', 'Метавселенная'
    ],
  },
  {
    id: 'video_games',
    name: 'Видеоигры',
    icon: '🎮',
    words: [
      'Майнкрафт Крипер', 'Ведьмак Геральт', 'Марио с грибом', 'Пакман',
      'Тетрис блок', 'GTA 5 машина', 'Dota 2 Рошан', 'CS:GO бомба',
      'Покебол', 'Cyberpunk 2077', 'Portal пушка', 'Mortal Kombat Скорпион',
      'Angry Birds', 'Among Us предатель', 'Half-Life Хедкраб', 'Sonic еж',
      'Zelda Мастер Меч', 'Skyrim дракон', 'Fallout Волт-Бой', 'Roblox аватар'
    ],
  },
  {
    id: 'professions',
    name: 'Профессии',
    icon: '🏛',
    words: [
      'Пожарный с шлангом', 'Космонавт', 'Врач-хирург', 'Детектив с лупой',
      'Шеф-повар с колпаком', 'Программист', 'Пилот самолета', 'Художник с беретом',
      'Балерина', 'Рок-музыкант с гитарой', 'Строитель с каской', 'Фокусник с кроликом',
      'Архитектор', 'Водолаз', 'Тренер по боксу', 'Диджей за пультом',
      'Фотограф', 'Ветеринар', 'Судья с молотком', 'Ученый в лаборатории'
    ],
  },
  {
    id: 'landmarks',
    name: 'Достопримечательности',
    icon: '🌍',
    words: [
      'Эйфелева башня', 'Египетские пирамиды', 'Великая Китайская стена', 'Статуя Свободы',
      'Биг-Бен', 'Колизей в Риме', 'Пизанская башня', 'Сиднейская опера',
      'Тадж-Махал', 'Сакура в Японии', 'Венецианская гондола', 'Гора Фудзи',
      'Стоунхендж', 'Мост Золотые Ворота', 'Московский Кремль', 'Акрополь'
    ],
  },
  {
    id: 'sports',
    name: 'Спорт & Увлечения',
    icon: '⚽️',
    words: [
      'Скейтбординг', 'Серфинг на волне', 'Сноубордист', 'Боксерский ринг',
      'Баскетбол кубок', 'Футбольные ворота', 'Хоккейные коньки', 'Шахматный король',
      'Йога на коврике', 'Рыбалка с удочкой', 'Боулинг шар', 'Альпинист на пике',
      'Фехтовальщик', 'Автогонки Формула-1', 'Парусный спорт', 'Дайвинг с аквалангом'
    ],
  },
  {
    id: 'fantasy',
    name: 'Фэнтези & Магия',
    icon: '🔮',
    words: [
      'Огнедышащий дракон', 'Единорог', 'Гаргулья', 'Волшебная палочка',
      'Сундук с сокровищами', 'Грифон', 'Заколдованный замок', 'Зелье невидимости',
      'Джинн из лампы', 'Русалка', 'Лесная фея', 'Кентавр',
      'Магический шар', 'Гном с киркой', 'Избушка на курьих ножках', 'Волшебная шляпа'
    ],
  },
  {
    id: 'vehicles',
    name: 'Транспорт & Техника',
    icon: '🚗',
    words: [
      'Двухэтажный автобус', 'Подводная лодка', 'Монстр-трак', 'Вертолет',
      'Паровоз с дымом', 'Воздушный шар', 'Гоночный болид', 'Пожарная машина',
      'Кабриолет', 'Гусеничный экскаватор', 'Дирижабль', 'Электроскутер',
      'Военный танк', 'Батискаф', 'Снегоход', 'Парусный корабль'
    ],
  }
];
