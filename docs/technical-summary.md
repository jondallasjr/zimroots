## ZimRoots — Technical Summary

**What it is:** An AI-powered WhatsApp chatbot that serves as Harare's first unified informal commerce directory. Think Craigslist meets WhatsApp meets Claude — purpose-built for a context where commerce runs through messaging apps, not websites. Anyone with a phone can post a listing or search for one, entirely through a WhatsApp conversation.

---

### The Core Problem It Solves

Zimbabwe's informal economy is enormous and highly active, but fragmented across dozens of siloed WhatsApp groups. If you need a plumber, a tailor, someone who makes custom furniture — the knowledge exists, but it's locked inside groups you may not be in, or buried in group message history you can't search. ZimRoots creates one common, searchable registry that anyone can contribute to and query.

---

### The Two User Roles

**Poster** (seller / business owner / job poster / event organizer / individual craftsperson): Creates and manages listings. They text the chatbot and get walked through a structured conversation to publish their entity. They can return later to edit or remove it. Every entity must be owned by a verified User — this is the security and accountability layer.

**Reader** (buyer / applicant / browser): Asks natural-language questions to find what they need. *"Does anyone in Harare sell dress shoes for men after 5pm on Sunday?"* The system finds the best matching listings and responds with formatted results. No app download, no website, no account required to search.

---

### The Six Entity Types

| # | Entity | Description |
|---|--------|-------------|
| 1 | **User** | Every poster must register. Phone number is the identity anchor. All entities link back to a User for ownership/accountability. |
| 2 | **Business** | Named entity (e.g. "Chipo's Tailoring"). Has location, description, contact info, category. |
| 3 | **Product** | Physical goods. Linked to a Business OR posted by an individual User directly. |
| 4 | **Service** | What someone offers to do. Tailoring, plumbing, graphic design, etc. |
| 5 | **Event** | Time-bounded: market days, exhibitions, sales. Has date/time/location. |
| 6 | **Job** | Employment opportunity. Posted by a Business or individual. |

The relationship model is hierarchical but flexible:
```
User → owns → Business → has → Products, Services, Events, Jobs
User → can also post standalone → Products, Services, Events, Jobs
```
A tailor who doesn't have a formal business can still post their services. A business can have multiple products. A product can be re-listed by multiple businesses. Relationships are tracked via foreign keys in Postgres.

---

### The WhatsApp Layer

Twilio is the bridge. A user texts a Twilio-managed WhatsApp number. Twilio fires a webhook POST to our server with the message body and sender's phone number. Our server processes it, calls the Claude API, and sends Claude's reply back through Twilio to the user's WhatsApp. From the user's perspective: they just texted a number and got a response. No app, no account creation friction.

The phone number is the session key. Each inbound message arrives tagged with the sender's number, which we use to look up their session state in Supabase — what flow they're in, what they've told us so far, whether they're a registered user.

---

### The AI Conversation Layer

Claude API handles all conversation logic. The system prompt gives Claude a detailed persona (ZimRoots directory assistant), knowledge of the entity schema, and clear instructions for two distinct modes:

**Poster mode:** Claude guides the user through a structured intake form via conversation. *"What's your business called? What do you sell? Where are you based? What are your hours?"* Claude validates responses, asks follow-ups for missing fields, and confirms before saving. On completion, it writes a new record to Supabase.

**Reader mode:** Claude receives the user's query, generates a vector embedding of it, runs a cosine similarity search against all relevant entities in Supabase (using pgvector), retrieves the top matches, and formats a clean, WhatsApp-appropriate response with names, descriptions, and contact details.

Claude also handles: ambiguous intent detection (is this a search or a posting?), multi-turn context (the user references something from 3 messages ago), corrections ("actually, I meant services, not products"), and graceful error handling.

---

### The Data Layer: Supabase + pgvector

**Why Supabase over flat files:** Flat files (JSON/Markdown per entity) are great for human readability and Git versioning, but they don't support the semantic search that makes this product powerful. Supabase gives us Postgres (relational integrity, FKs, filtering, joins) plus pgvector (cosine similarity search on embeddings) in a single hosted, free-tier platform. Claude Code can manage all schema migrations and query writing — the complexity is handled for you.

**The embedding column:** Every entity has an `embedding` column of type `vector(1536)`. When a new entity is created, we generate an embedding of its description + key attributes using the Claude API (or OpenAI embeddings) and store it. When a reader queries *"who fixes motorcycles in Avondale,"* we embed that query and find the nearest vectors. This is faster and more semantically intelligent than keyword search.

**Schema overview (simplified):**
- `users` — phone, name, verified, created_at
- `businesses` — name, description, category, location, hours, user_id FK
- `products` — name, description, price_range, business_id FK (nullable), user_id FK, embedding
- `services` — name, description, category, business_id FK (nullable), user_id FK, embedding
- `events` — name, description, date, location, business_id FK (nullable), user_id FK, embedding
- `jobs` — title, description, type, business_id FK (nullable), user_id FK, embedding

---

### Alpha v0 — What We're Building Now

1. **Supabase schema** — all 6 tables, relationships, pgvector extension enabled, RLS policies
2. **Webhook server** — Node.js/Express that receives Twilio POSTs and returns TwiML responses
3. **Session manager** — stores per-phone conversation state in Supabase
4. **Claude integration** — system prompt, conversation loop, intent detection
5. **Poster flow** — guided entity creation saved to DB
6. **Reader flow** — query → embedding → vector search → formatted response
7. **Basic admin CLI** — seed data, view listings, flag/remove entities

---

### Post-MVP Roadmap

- **WhatsApp group ingestion:** Manual export → parse → bulk-insert pipeline. A PA exports group chat history as `.txt`, a script scans it for listing-like messages, Claude classifies and extracts structured data, admin reviews before publishing.
- **Web directory:** `zimroots.co.zw` — a public-facing Next.js site that queries the same Supabase DB. Generated "pages" per entity, SEO-friendly.
- **Media support:** Product photos sent via WhatsApp → stored in Supabase Storage → served on web pages.
- **Ratings & reviews:** Users can leave feedback on listings.
- **Analytics dashboard:** Most searched categories, top posters, geographic heat maps.
- **Multi-city expansion:** Add a `city` field to all entities. Bulawayo next.
- **EcoCash/payment hints:** Surface payment method info (cash, EcoCash, bank transfer) per listing.

---

That's the full picture as I understand it. Now let me build the formal tech spec doc.Your tech spec is ready — 10 sections, fully formatted, portfolio-quality. Here's what's in it:

**Document structure:**
1. Executive Summary
2. Problem Statement
3. Product Overview — roles, all 6 entity types with relationship rules
4. System Architecture — layered diagram, full tech stack table with rationale
5. Data Model — ER summary, all table schemas including the embedding column strategy
6. Conversation Flows — session state design, Reader flow table, Poster flow table
7. Alpha v0 Build Plan — 8 deliverables, folder structure, required env vars
8. Post-MVP Roadmap — 6 phases (group ingestion → web dir → media → trust → expansion)
9. Key Decisions & Rationale — 7 architectural choices explained
10. Open Questions — 6 things to decide before we start building
+ Glossary appendix

---

**Recommended next session:** Start coding Alpha v0. I'd suggest we tackle deliverables in this order:
1. Supabase schema SQL (`schema.sql`)
2. Server + Twilio webhook skeleton
3. Claude conversation loop
4. Reader flow (fastest demo-able win)
5. Poster flow

Want to jump straight into the code now, or are there any corrections to the spec first?