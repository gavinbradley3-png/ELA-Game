# Receipts — Live Classroom Evidence Battles

A teacher-led live ELA game for grades 7–9. Students read a shared passage, annotate with
purpose, answer a challenge prompt with **claim + evidence + reasoning**, judge anonymous peer
responses with required justification, revise (or defend) their answer, and reflect — all in one
45–50 minute class period, with the teacher controlling every phase.

Full product spec: [DESIGN.md](./DESIGN.md).

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **SQLite** (better-sqlite3 + Drizzle ORM) — zero-setup local database; the schema is
  relational and portable to Postgres when needed
- Teacher auth via signed HTTP-only session cookies (bcrypt password hashing)
- Live sync via short-interval polling against server-authoritative round state

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Create a teacher account, add a class and a passage with a
challenge prompt, then launch a round. Students join at `/play` with the 6-letter code —
no accounts or emails.

In production, set `AUTH_SECRET` (see `.env.example`).

## What's implemented (Evidence Battle MVP)

- Teacher accounts, classes, reusable passage bank with challenge prompts
- Live rounds with join codes, nickname join (deduped, profanity-filtered), rejoin via cookie
- Server-authoritative phase state machine: Lobby → Reading → Annotating → Prompt →
  Submitting → Peer Review → Revising → Reveal → Reflection → Complete
- Teacher live controls: advance/jump phases, pause/resume, ±1 min timers, lock join,
  lock submissions, hide names, remove/restore students and responses, spotlight
- Annotation tool: highlight + tag (10 tags), highlight limits, over-highlight guard
- Submission: evidence selected from the passage itself, claim, reasoning, confidence —
  with anti-garbage validation (length floors, quote-restating detection)
- Anonymous side-by-side peer comparison with required rubric criteria + written justification
- Revision phase: revise with a change explanation, or defend the original with a written case
- Reveal: class evidence clusters, spotlighted work, participation stats
- Teacher dashboard: live counts, annotation heat map, evidence choices with peer votes,
  flags (thin reasoning / restates quote), who improved after revision, discussion starters
- CSV export (anonymous or named)

## Development

```bash
npm run build   # production build
npx tsc --noEmit
```

The SQLite database is created automatically at `data/receipts.db` on first run.
