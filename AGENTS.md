# AGENTS.md — Fake Artist Cyberpunk Party Game

## Commands
- Build: `pnpm build`
- Typecheck: `pnpm tsc --noEmit`
- Dev server: `pnpm dev`

## Architecture & Conventions
- Stack: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (Auth, RLS, Realtime Broadcast)
- Theme: Cyberpunk Neon (hot pink `#ff007f`, cyan glow `#00f0ff`, deep dark background `#0a0a12`, glassmorphism, glowing borders)
- Realtime: Drawing strokes & game ticks use Supabase Realtime Broadcast (channel `room:<room_code>`) for high speed & zero DB overhead.
- DB State: Rooms & Player states synced via Supabase client with RLS security policies hiding secret words from Fake Artist.
