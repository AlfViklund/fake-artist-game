# Graph Report - fake-artist-game  (2026-07-23)

## Corpus Check
- 22 files · ~11,941 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 138 nodes · 181 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13e3b278`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- dependencies
- compilerOptions
- page.tsx
- game.ts
- include
- package.json
- layout.tsx
- page.tsx
- AGENTS.md — Fake Artist Cyberpunk Party Game
- README.md
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `RoomPlayer` - 12 edges
3. `Room` - 10 edges
4. `include` - 7 edges
5. `scripts` - 4 edges
6. `VotingPhaseProps` - 4 edges
7. `getRandomWord()` - 4 edges
8. `Vote` - 4 edges
9. `StrokeData` - 4 edges
10. `WORD_BANK` - 4 edges

## Surprising Connections (you probably didn't know these)
- `VotingPhase()` --references--> `react`  [EXTRACTED]
  src/components/VotingPhase.tsx → package.json
- `PlayerCardProps` --references--> `RoomPlayer`  [EXTRACTED]
  src/components/PlayerCard.tsx → src/types/game.ts
- `RoomPage()` --calls--> `getRandomWord()`  [EXTRACTED]
  src/app/room/[code]/page.tsx → src/lib/wordBank.ts
- `DrawingCanvasProps` --references--> `StrokeData`  [EXTRACTED]
  src/components/DrawingCanvas.tsx → src/types/game.ts
- `FakeGuessPhaseProps` --references--> `Room`  [EXTRACTED]
  src/components/FakeGuessPhase.tsx → src/types/game.ts

## Import Cycles
- None detected.

## Communities (14 total, 3 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, pg, playwright, tailwindcss, @tailwindcss/postcss, @types/canvas-confetti, @types/node, @types/pg (+13 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (20): canvas-confetti, clsx, framer-motion, lucide-react, next, dependencies, canvas-confetti, clsx (+12 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 3 - "page.tsx"
Cohesion: 0.26
Nodes (9): FakeGuessPhaseProps, LobbyProps, PlayerCard(), PlayerCardProps, ResultsPhaseProps, VotingPhaseProps, Room, RoomPlayer (+1 more)

### Community 4 - "game.ts"
Cohesion: 0.15
Nodes (14): RoomPage(), DrawingCanvasProps, NEON_COLORS, getRandomWord(), CategoryWords, ClearPayload, GameStateBroadcastPayload, GameStatus (+6 more)

### Community 5 - "include"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 6 - "package.json"
Cohesion: 0.25
Nodes (7): name, private, scripts, build, dev, start, version

### Community 7 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 9 - "AGENTS.md — Fake Artist Cyberpunk Party Game"
Cohesion: 0.50
Nodes (3): AGENTS.md — Fake Artist Cyberpunk Party Game, Architecture & Conventions, Commands

### Community 10 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **67 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **Why does `VotingPhase()` connect `dependencies` to `page.tsx`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._