# ZimRoots
## AI-Powered WhatsApp Directory for Harare
### Alpha v0 — Technical Specification & System Architecture

| Field | Value |
|---|---|
| Version | v0.1 — Draft |
| Date | March 2026 |
| Status | Alpha — In Development |
| Scope | Harare, Zimbabwe (MVP) |
| Primary Channel | WhatsApp via Twilio |
| AI Model | Claude API (Anthropic) |
| Data Layer | Supabase (Postgres + pgvector) |

---

## 1. Executive Summary

ZimRoots is an AI-powered directory for Harare's informal economy, delivered entirely through WhatsApp. It allows individuals — traders, craftspeople, service providers, and businesses of all sizes — to list their offerings in a shared, searchable registry, and allows anyone to query that registry using natural language.

Unlike a website or app, ZimRoots meets users where they already are: WhatsApp. There is no installation, no account creation screen, and no learning curve. You text a number, and the AI handles the rest.

The MVP focuses exclusively on one-on-one WhatsApp interactions in Harare, covering six entity types: Users, Businesses, Products, Services, Events, and Jobs.

---

## 2. Problem Statement

Zimbabwe's informal economy is large, active, and almost entirely unindexed. Commerce runs through WhatsApp groups, word-of-mouth, and personal networks. Finding a service provider, a product, or a job opportunity requires knowing the right people or being in the right groups.

This creates three structural problems:

- **Discovery is fragmented** — listings are buried in dozens of siloed WhatsApp groups with no cross-group search.
- **Access is unequal** — if you're not in the right group, the information doesn't exist to you.
- **Listings are ephemeral** — messages scroll away; there is no persistent, searchable record.

ZimRoots solves all three by creating one common registry with a conversational AI interface, accessible to anyone with WhatsApp.

---

## 3. Product Overview

### 3.1 The Two User Roles

| Role | Also Known As | What They Do |
|---|---|---|
| **Poster** | Seller / Business Owner / Job Poster | Creates and manages listings. Walks through a guided AI conversation to publish an entity. Can return to edit or remove. |
| **Reader** | Buyer / Applicant / Browser | Sends natural-language queries to find listings. No registration required to search. |

### 3.2 The Six Entity Types

| # | Entity | Description | Linked To |
|---|---|---|---|
| 1 | **User** | Every poster must register. Phone number is the identity and ownership anchor. | — |
| 2 | **Business** | Named entity with location, hours, category, description. | User |
| 3 | **Product** | Physical goods with name, description, price range. | Business (optional) + User |
| 4 | **Service** | What someone offers to do: plumbing, tailoring, tutoring, etc. | Business (optional) + User |
| 5 | **Event** | Time-bounded: markets, exhibitions, sales. Has date/time/location. | Business (optional) + User |
| 6 | **Job** | Employment opportunity with title, type, and description. | Business (optional) + User |

> **Note:** Every entity requires a User owner for accountability. Business linkage is optional — an individual craftsperson can post a service or product without being associated with a formal business.

---

## 4. System Architecture

### 4.1 Architecture Overview

```
[ WhatsApp User ]
       ↕  (WhatsApp messaging)
[ Twilio Messaging API ]
       ↕  (HTTP webhook POST)
[ ZimRoots Server — Node.js/Express ]
       ↕  (Claude API calls)              ↕  (Supabase queries)
[ Claude API (Anthropic) ]     [ Supabase — Postgres + pgvector ]
```

### 4.2 Technology Stack

| Layer | Technology | Why |
|---|---|---|
| WhatsApp Interface | Twilio Messaging API | Easiest WhatsApp sandbox + webhook setup; well-documented; production-ready |
| Backend Server | Node.js + Express | Lightweight, fast webhook handling; large ecosystem; easy to deploy |
| AI / Conversation | Claude API (Anthropic — Sonnet) | Best-in-class at nuanced conversation and structured data extraction |
| Database | Supabase (Postgres) | Hosted, free tier, relational integrity, built-in auth and storage |
| Vector Search | pgvector (via Supabase) | Semantic similarity search on entity embeddings — same DB, no extra service |
| Embeddings | OpenAI text-embedding-3-small | Cheap, fast, 1536-dim vectors; swap for Claude embeddings when available |
| Hosting | Railway or Render | Free tier, one-click deploys from GitHub, auto-restarts |
| Version Control | GitHub | Code + migration history; portfolio visibility |

---

## 5. Data Model

### 5.1 Entity Relationship Summary

```
users
  └── businesses        (user_id FK)
        ├── products     (business_id FK, also user_id FK)
        ├── services     (business_id FK, also user_id FK)
        ├── events       (business_id FK, also user_id FK)
        └── jobs         (business_id FK, also user_id FK)

(business_id is nullable — individuals can post without a formal business)
```

### 5.2 Table Schemas

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | `uuid PK` | Auto-generated |
| phone | `text UNIQUE NOT NULL` | WhatsApp number, E.164 format |
| name | `text` | Display name, collected during onboarding |
| verified | `boolean` | Future: phone OTP verification |
| created_at | `timestamptz` | Auto-set |

#### `businesses`
| Column | Type | Notes |
|---|---|---|
| id | `uuid PK` | |
| user_id | `uuid FK → users.id` | Owner/operator |
| name | `text NOT NULL` | |
| description | `text` | |
| category | `text` | e.g. "Retail", "Food & Beverage", "Trades" |
| location | `text` | Suburb or address in Harare |
| hours | `text` | Human-readable: "Mon–Fri 8am–5pm" |
| contact | `text` | Phone, email, or social handle |
| embedding | `vector(1536)` | pgvector — semantic search index |
| created_at | `timestamptz` | |

#### `products` / `services` / `events` / `jobs`

All four follow the same base pattern as `businesses`, with these shared columns:

```
id, user_id FK, business_id FK (nullable), name, description, category, embedding, created_at
```

Plus type-specific additions:

| Entity | Extra Columns |
|---|---|
| `products` | `price_range text` |
| `services` | *(base only)* |
| `events` | `event_date timestamptz`, `event_location text` |
| `jobs` | `job_type text` — full-time / part-time / contract / casual |

### 5.3 Vector Search Strategy

When a new entity is created, we generate a text embedding of its `name + description + category` and store it in the `embedding` column. When a Reader submits a query:

1. Embed the query using the same model
2. Run a pgvector cosine similarity search across relevant tables
3. Filter by city/category if the query implies constraints
4. Return top-N results to Claude for formatting

This enables queries like *"who fixes motorbikes in Avondale"* to match a service listed as *"motorcycle repair and maintenance"* in Avondale — even without exact keyword overlap.

---

## 6. Conversation Flows

### 6.1 Session State

Each inbound WhatsApp message arrives with the sender's phone number. This is the session key. We store a `sessions` table in Supabase:

| Column | Type | Notes |
|---|---|---|
| phone | `text PK` | Sender's WhatsApp number |
| state | `text` | Current flow stage, e.g. `POSTER_BUSINESS_NAME`, `READER_QUERY` |
| buffer | `jsonb` | Partial data collected so far in the current flow |
| user_id | `uuid FK` | Null until user registers |
| updated_at | `timestamptz` | Sessions idle for 30+ min reset to neutral |

### 6.2 Reader Flow

```
User texts: "Does anyone sell dress shoes in Harare on Sundays?"
       ↓
Server looks up session — no active poster flow → Reader mode
       ↓
Claude detects search intent, extracts constraints (category: shoes, timing: Sunday)
       ↓
Server embeds query → pgvector search on products + businesses
       ↓
Claude receives top results → formats readable WhatsApp response
       ↓
Twilio delivers response to user
```

### 6.3 Poster Flow — New Listing

```
User texts: "I want to list my business"
       ↓
Server detects poster intent → checks if user is registered
       ↓
If new: Claude collects name, confirms phone number
       ↓
Claude asks: "What type of listing? Business / Product / Service / Event / Job"
       ↓
Claude walks through structured intake: name, description, category, location, contact
       ↓
Claude summarises: "Here's what I'll post — does this look right?"
       ↓
On confirmation: server saves entity to Supabase, generates + stores embedding
       ↓
User receives: "Your listing is live! Reply EDIT or REMOVE to manage it."
```

### 6.4 Intent Detection

Claude handles intent classification on every inbound message:

| Signal | Detected Intent |
|---|---|
| "list", "add", "post", "sell", "I offer", "looking to hire" | Poster mode |
| "find", "does anyone", "looking for", "who sells", "where can I" | Reader mode |
| "edit", "update", "change my listing" | Edit flow |
| "remove", "delete", "take down" | Remove flow |
| Ambiguous | Claude asks: "Are you looking for something, or would you like to post a listing?" |

---

## 7. Alpha v0 Build Plan

### 7.1 Deliverables

| # | Deliverable | Description |
|---|---|---|
| 1 | Supabase Schema | 6 tables + pgvector extension + RLS policies + seed data script |
| 2 | Webhook Server | Node.js/Express server that handles Twilio POSTs and returns TwiML |
| 3 | Session Manager | Reads/writes session state to Supabase per phone number |
| 4 | Claude Integration | System prompt, conversation loop, intent detection, entity extraction |
| 5 | Poster Flow | Full guided intake → validated → saved to DB with embedding |
| 6 | Reader Flow | Query → embed → pgvector search → Claude formats → response |
| 7 | Admin CLI | Simple script to seed, list, and remove entities |
| 8 | README + .env.example | Setup documentation for local dev and deployment |

### 7.2 Folder Structure

```
/zimroots
  /src
    server.js          ← Express app + Twilio webhook handler
    session.js         ← Session read/write helpers
    claude.js          ← Claude API wrapper + system prompt
    search.js          ← pgvector similarity search helper
    embed.js           ← Embedding generation helper
    /flows
      reader.js        ← Reader query → search → format
      poster.js        ← Poster intake → validate → save
  /supabase
    schema.sql         ← Full table definitions + pgvector
    seed.sql           ← Sample Harare listings for demo/testing
  /admin
    cli.js             ← List / add / remove entities
  .env.example
  README.md
  package.json
```

### 7.3 Required Environment Variables

```bash
TWILIO_ACCOUNT_SID=          # From Twilio Console
TWILIO_AUTH_TOKEN=           # From Twilio Console
TWILIO_WHATSAPP_NUMBER=      # Your Twilio WhatsApp sandbox number

ANTHROPIC_API_KEY=           # Claude API key (Anthropic Console)

SUPABASE_URL=                # From Supabase project settings
SUPABASE_SERVICE_KEY=        # Service role key for server-side access

EMBEDDING_MODEL=text-embedding-3-small   # OpenAI embedding model
OPENAI_API_KEY=              # Only needed for embeddings
```

---

## 8. Post-MVP Roadmap

### Phase 2 — Group Message Ingestion
Rather than attempting API-level WhatsApp group access (which Meta restricts), we'll use a manual pipeline:

- A PA exports daily chat logs from target WhatsApp groups as `.txt` files
- A parser script uses Claude to identify and classify listing-like messages
- Extracted structured data is queued for admin review before publishing
- Over time, this seeds the DB with organic, real Harare listings

### Phase 3 — Web Directory
A public-facing Next.js website (`zimroots.co.zw` or similar) querying the same Supabase DB. Auto-generated pages per entity, SEO-optimized, shareable links.

### Phase 4 — Media & Enrichment
- Product/service photos sent via WhatsApp → stored in Supabase Storage → shown on web pages
- Structured operating hours (for "open now" queries)
- Price tiers and payment method hints (cash, EcoCash, bank transfer)

### Phase 5 — Trust & Ratings
- Verified badge for businesses (manual review process)
- Simple 1–5 ratings after a transaction
- Report / flag mechanism for spam or inaccurate listings

### Phase 6 — Expansion
- Multi-city support: `city` field on all entities; Bulawayo and Mutare next
- Multi-language: Shona and Ndebele query support
- Analytics dashboard: most-searched categories, top-active posters, geographic heatmaps

---

## 9. Key Decisions & Rationale

| Decision | Chosen Approach | Rationale |
|---|---|---|
| WhatsApp access | Twilio Messaging API | Simplest path to production; no Meta Business API approval needed for sandbox |
| Group messages (MVP) | Excluded from v0 | Meta API restrictions; manual export pipeline deferred to Phase 2 |
| Data storage | Supabase (Postgres + pgvector) | Single hosted DB handles relational + vector needs; free tier; Claude Code manages migrations |
| Entity files | DB records, not flat files | Flat files don't support vector search; DB gives relational integrity; can always export to markdown |
| AI model | Claude API (Sonnet) | Best at nuanced multi-turn conversation and structured data extraction from informal text |
| Session state | Supabase `sessions` table | Stateless server; phone number is natural session key; persists across restarts |
| City scope | Harare only (MVP) | Focus quality over coverage; validate product-market fit before expanding |

---

## 10. Open Questions

- **Domain:** `zimroots.co.zw` vs. `hararedirectory.com` vs. `aidirectory.co.zw` — which fits the brand?
- **User verification:** For MVP, is phone number sufficient, or do we need OTP?
- **Embedding model:** Use OpenAI `text-embedding-3-small` (cheaper, faster) or wait for Claude native embeddings?
- **WhatsApp Business API:** Apply for a proper Meta Business number in parallel, or stay on Twilio sandbox for v0?
- **Seed data:** Manually create ~50 sample Harare listings for demo, or launch empty?
- **Language:** English only for v0, or detect Shona and respond bilingually from the start?

---

## Appendix: Glossary

| Term | Definition |
|---|---|
| Poster | A ZimRoots user who creates listings (sells, offers services, posts jobs, etc.) |
| Reader | A ZimRoots user who searches listings. No registration required. |
| Entity | Any of the six data types: User, Business, Product, Service, Event, Job |
| Embedding | A dense numerical vector representing the semantic meaning of a text description |
| pgvector | A Postgres extension that adds vector data types and cosine similarity search |
| Twilio | Communications platform providing the WhatsApp API layer for ZimRoots |
| TwiML | Twilio Markup Language — XML format for instructing Twilio how to respond |
| Session | Per-phone conversation state stored in Supabase between message exchanges |
| Cosine similarity | How closely two embedding vectors point in the same direction (0–1; higher = more similar) |
| E.164 | International phone number format, e.g. +2637XXXXXXXX for Zimbabwe |