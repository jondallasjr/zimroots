# ARCHITECTURE.md

Current-state blueprint of how the system fits together.

---

## System Overview

```
WhatsApp User
    ↕  (WhatsApp messaging)
Twilio Messaging API
    ↕  (HTTP POST webhook)
Express Server (src/server.js)
    ├── Session Manager (src/session.js) ↔ Supabase sessions table
    ├── Message Router → detects intent via Claude
    │   ├── Reader Flow (src/flows/reader.js)
    │   │   ├── Embed query (src/embed.js) → OpenAI API
    │   │   ├── Vector search (src/search.js) → Supabase pgvector
    │   │   └── Format results → Claude API
    │   └── Poster Flow (src/flows/poster.js)
    │       ├── Registration → Supabase users table
    │       ├── Guided intake → Claude API (multi-turn)
    │       ├── Generate embedding → OpenAI API
    │       └── Save entity → Supabase entity table
    └── Claude API (src/claude.js) — all conversation logic
```

## Request Lifecycle

1. User sends WhatsApp message → Twilio fires POST to `/webhook`
2. Server extracts phone number and message body
3. Session manager loads or creates session for that phone
4. **Routing decision:**
   - Active poster flow (`state.startsWith('POSTER_')`) → poster handler
   - Active reader follow-up (`state === 'READER_RESULTS'`) → reader handler
   - Otherwise → Claude detects intent → routes accordingly
5. Claude processes message, returns JSON with `reply` + `action`
6. Server executes any action (search, save, register, state change)
7. Reply sent back via TwiML response to Twilio → WhatsApp user

## Data Flow

- **Identity:** Phone number (E.164) is the universal key. Sessions keyed by phone. Users identified by phone.
- **State:** Session state + buffer stored in Supabase `sessions` table. Server is stateless.
- **History:** Recent messages stored in session `history` JSONB column, passed to Claude for multi-turn context.
- **Embeddings:** Generated via OpenAI `text-embedding-3-small` (1536-dim). Stored in entity `embedding` column. Search uses pgvector cosine similarity.

## Key Boundaries

| Boundary | Left Side | Right Side |
|---|---|---|
| WhatsApp ↔ Server | Twilio (HTTP POST) | Express webhook handler |
| Server ↔ AI | Structured prompts + context | Claude JSON responses |
| Server ↔ DB | Supabase JS client | Postgres + pgvector |
| Server ↔ Embeddings | OpenAI SDK | text-embedding-3-small API |

## Module Responsibilities

| Module | Does | Does NOT |
|---|---|---|
| `server.js` | Webhook handling, routing, TwiML response | Business logic, direct DB queries |
| `claude.js` | System prompt, message formatting, JSON parsing | DB access, embedding generation |
| `session.js` | Session CRUD, history management | Intent detection, message routing |
| `search.js` | Vector search, result enrichment | Embedding generation |
| `embed.js` | Embedding generation, text building | Search, DB writes |
| `flows/reader.js` | Search orchestration, result formatting | Entity creation |
| `flows/poster.js` | Registration, intake, entity saving | Search queries |
