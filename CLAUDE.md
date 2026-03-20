# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZimRoots is an AI-powered WhatsApp chatbot that serves as Harare's unified informal commerce directory. Users interact entirely through WhatsApp — posters create listings via guided conversation, readers search with natural language queries that use semantic vector search.

## Status

Alpha v0 — core scaffolding complete, not yet tested with live services.

## Tech Stack

- **Backend:** Node.js + Express (ES modules, `"type": "module"`)
- **AI:** Claude API (Anthropic Sonnet) for conversation, intent detection, entity extraction
- **Database:** Supabase (Postgres + pgvector) for relational data and vector similarity search
- **Embeddings:** OpenAI text-embedding-3-small (1536-dim vectors)
- **WhatsApp:** Twilio Messaging API (webhook POST → TwiML response)
- **Hosting:** Railway or Render

## Commands

```bash
npm run dev        # Start server with --watch (auto-restart on changes)
npm start          # Start server (production)
npm run admin      # Run admin CLI (append: list, users, sessions, stats, remove, help)
```

## Architecture

```
WhatsApp User ↔ Twilio ↔ Express Server ↔ Claude API
                                        ↔ Supabase (Postgres + pgvector)
```

Phone number is the session key. Session state stored in Supabase `sessions` table. Server is stateless. See `ARCHITECTURE.md` for full system diagram and module responsibilities.

### Six Entity Types

User → owns → Business → has → Products, Services, Events, Jobs
User → can also post standalone → Products, Services, Events, Jobs

All entities except User have an `embedding` vector(1536) column for semantic search.

### Two Core Flows

- **Reader flow:** query → embed → pgvector cosine similarity search → Claude formats results
- **Poster flow:** Claude guides structured intake conversation → validate → save to DB with embedding

### Claude API Contract

Claude always responds with JSON: `{ "reply": "...", "action": null | {...} }`. Action types: `SEARCH`, `SAVE`, `REGISTER`, `SET_STATE`. System prompt lives in `src/claude.js`.

## Project Structure

```
src/
  server.js          — Express + Twilio webhook handler + message routing
  session.js         — Session CRUD and history management
  claude.js          — Claude API wrapper + system prompt
  search.js          — pgvector similarity search + result enrichment
  embed.js           — OpenAI embedding generation
  supabase.js        — Supabase client singleton
  flows/
    reader.js        — Reader: query → search → format
    poster.js        — Poster: register → intake → save
supabase/
  schema.sql         — Full DDL: 7 tables + pgvector + search functions + RLS
  seed.sql           — Sample Harare listings (5 users, 3 businesses, etc.)
admin/
  cli.js             — Admin CLI for managing entities
docs/
  alpha-v0-tech-spec.md  — Full technical specification
  technical-summary.md   — High-level overview
```

## Key Design Decisions

- Supabase over flat files: vector search requires pgvector; relational integrity for entity ownership
- Phone number as identity anchor (E.164 format, e.g. +2637XXXXXXXX)
- Claude handles all intent classification (poster vs reader vs edit vs remove)
- Business linkage is optional — individuals can post without a formal business
- Harare only for MVP; multi-city via `city` field later
- Sessions idle 30+ minutes reset to neutral state

## Project Markdown Files — How to Use Them

These files are the project's living documentation. Read and update them as you work.

### Workflow Rules

1. **Start of every session:** Read `TODO.md` to understand current priorities and `LOG.md` (last few entries) for recent context.
2. **After completing any task:** Update `LOG.md` with what was done, decisions made, and any blockers.
3. **After completing or discovering a task:** Update `TODO.md` — mark done items `[x]`, add new items.
4. **After encountering and resolving a bug:** Add an entry to `TROUBLESHOOTING.md` with symptoms, cause, and fix.
5. **After changing system structure:** Update `ARCHITECTURE.md` to reflect the current state.
6. **After establishing a new pattern:** Add it to `CONVENTIONS.md`.

### File Reference

| File | Purpose | When to Update |
|---|---|---|
| `LOG.md` | Chronological record of progress, decisions, blockers | Every turn — after completing a task or changing direction |
| `TODO.md` | Living prioritized task list with status markers | When identifying, starting, or completing work |
| `ARCHITECTURE.md` | Current-state system blueprint (components, data flow, boundaries) | When adding components or changing how they interact |
| `CONVENTIONS.md` | Style guide, naming rules, code patterns | When establishing a pattern or "we always do X" rule |
| `TROUBLESHOOTING.md` | Problem → solution lookup table | After encountering and resolving a technical issue |

### Situational Files (create when needed)

| File | Purpose | When to Create |
|---|---|---|
| `DECISIONS.md` | ADR-lite: what was decided, why, what was rejected | When making non-trivial technical choices with alternatives |
| `SCHEMA.md` | Canonical data model reference | When data models become complex or cross-referenced |
| `PROMPTS.md` | Versioned prompt templates with change history | When iterating on Claude system prompt or validation prompts |
| `TESTING.md` | Test plan, edge cases, expected behaviors | When defining test cases or after fixing regressions |
| `DEPENDENCIES.md` | External services, API keys, environment deps, blockers | When adding external services or hitting external blockers |
| `GLOSSARY.md` | Domain-specific term definitions | When domain jargon needs precise definitions |
| `HANDOFF.md` | "Here's what you need to know" briefing | Before transitions or after long gaps |
| `CONTEXT.md` | Business context, stakeholders, constraints | At project kickoff or when business context changes |
| `API_REFERENCE.md` | External API details, quirks, rate limits | When integrating with new APIs or discovering undocumented behavior |
