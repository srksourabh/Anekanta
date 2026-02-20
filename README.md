# Anekanta.org — Many-Sided Truth

Structured debate platform inspired by Kialo, themed around the Jain philosophical concept of Anekantavada (many-sidedness of truth).

## Quick Start

```bash
npm install
npm run db:seed    # Seeds 5 users, 4 debates with arguments
npm run dev        # http://localhost:3000
```

## Login

After seeding, use any of these accounts (password: `password123`):
- arjuna@example.com
- draupadi@example.com
- chanakya@example.com
- gargi@example.com
- ashoka@example.com

## Features

- **Argument Tree**: Thesis → Pro/Con hierarchical tree with recursive nesting
- **Impact Voting**: 1-4 scale (Low → Decisive) with aggregate scoring
- **Comments**: Per-argument discussion threads
- **Activity Feed**: Real-time log of all debate actions
- **User Profiles**: Stats, contribution history
- **Categories & Search**: Filter debates by topic, sort by recent/popular/active
- **Auth**: JWT-based registration and login

## Stack

- Next.js 14 (App Router)
- SQLite via better-sqlite3
- Tailwind CSS (Indian philosophy theme: saffron, earth tones, mandala accents)
- JWT auth (jose + bcryptjs)
