# LOG.md

Chronological record of project progress, decisions, and context.

---

## 2026-03-21 — Alpha v0 Scaffolding Complete

**What happened:**
- Initialized Node.js project with ES modules
- Installed dependencies: express, twilio, @anthropic-ai/sdk, @supabase/supabase-js, openai, dotenv
- Created full Supabase schema (`supabase/schema.sql`): 6 entity tables + sessions table + pgvector extension + vector search functions + RLS policies
- Built all core modules:
  - `src/server.js` — Express webhook server with Twilio integration and message routing
  - `src/session.js` — Session manager (get/update/history/link user)
  - `src/claude.js` — Claude API integration with full system prompt and structured JSON responses
  - `src/embed.js` — OpenAI embedding generation
  - `src/search.js` — pgvector similarity search (single table + cross-table)
  - `src/flows/reader.js` — Reader flow: query → embed → search → Claude formats
  - `src/flows/poster.js` — Poster flow: registration + guided intake → save with embedding
  - `admin/cli.js` — Admin CLI (list, users, sessions, stats, remove)
- Created seed data (`supabase/seed.sql`) with 5 users, 3 businesses, 3 products, 3 services, 2 events, 2 jobs — all Harare-specific

**Status:** Code scaffolding done. Not yet tested — needs Supabase project setup and env vars configured.

**Next steps:**
1. Create Supabase project and run schema.sql
2. Configure .env with real API keys
3. Set up Twilio WhatsApp sandbox
4. Run seed.sql and generate embeddings for seed data
5. Test end-to-end with a real WhatsApp message
