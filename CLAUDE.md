# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anekanta is a structured debate platform inspired by Jain philosophy of Anekantavada ("many-sided truth"). Users create debates with a thesis, post nested pro/con arguments, vote, comment, and react. Supports three languages: English, Bengali, Hindi. Deployed on Vercel.

## Commands

```bash
npm run dev          # Start dev server (Next.js 14)
npm run build        # Production build
npm run start        # Start production server
npm run db:seed      # Seed database with sample data (scripts/seed.js)
```

No test runner or linter is currently configured.

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router), React 18, TypeScript (strict)
- **Database**: Turso (hosted SQLite) via `@libsql/client`
- **Auth**: JWT via `jose`, passwords hashed with `bcryptjs` (12 rounds), session cookie `anekanta-session`
- **Styling**: Tailwind CSS with custom Indian-inspired palette
- **IDs**: Generated with `nanoid`
- **PWA**: Service worker registration, manifest.json

### Database Layer (`src/lib/db.ts`)
`CompatDb` wraps `@libsql/client` to provide a `prepare(sql).run/get/all(params)` API. **All `.run()`, `.get()`, `.all()` calls are async and must be awaited.** Schema is auto-created via `CREATE TABLE IF NOT EXISTS` on first connection. Access the singleton via `await getDb()`.

**Key pattern**: All API routes call `const db = await getDb()` then use `await db.prepare(sql).run/get/all(params)`. Parameters are passed as positional `?` placeholders.

### Environment Variables
- `TURSO_DATABASE_URL` — Turso database URL (required)
- `TURSO_AUTH_TOKEN` — Turso auth token
- `JWT_SECRET` — signing key for JWT tokens (falls back to hardcoded default in dev)

### Authentication (`src/lib/auth.ts`)
- `getCurrentUser()` reads the JWT cookie and returns the `User` or `null`
- `createSession(user)` sets an httpOnly cookie with 7-day expiry
- User roles: `user` and `admin`

### Argument Tree Structure
Arguments have `parent_id` (nullable) and `depth` fields enabling nested hierarchies within a debate. Type is `pro`, `con`, or `thesis`. The `ArgumentNode` component renders the tree recursively.

### API Routes (`src/app/api/`)
RESTful Next.js route handlers:
- `/api/auth/` — login, register, current user
- `/api/debates/` — CRUD, with nested routes for arguments
- `/api/arguments/[id]/` — voting, comments
- `/api/reactions/` — emoji reactions
- `/api/activity/` — debate activity feed
- `/api/community/` — community/user listing
- `/api/user/` — profile updates, password change, account deletion
- `/api/admin/` — flagged content moderation, stats

### Design System
- **Colors**: `saffron` (orange), `earth` (brown), `lotus` (pink), `teal` — plus `pro` (#16a34a green) and `con` (#dc2626 red)
- **Fonts**: `font-heading` (Cormorant Garamond + Tiro Bangla), `font-body` (Noto Sans with Bengali/Devanagari variants)
- **Theme color**: #c2793a

### i18n (`src/lib/i18n.ts`)
Translation keys for en/bn/hi. `LanguageProvider` component provides React context. The `TranslateButton` component offers per-item translation for user-generated content.

### Content Moderation (`src/lib/moderation.ts`)
Rule-based toxicity scoring with pattern matching. Returns `ModerationResult` with score (0-1) and flags.

### Data Model
Core tables: `users`, `debates`, `arguments`, `votes`, `comments`. Supporting tables: `reactions`, `activity`, `flagged_content`. All IDs are nanoid strings. Timestamps are ISO datetime strings.
