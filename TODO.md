# TODO.md

Living task list. Check at the start of every session.

Status markers: `[ ]` pending · `[~]` in progress · `[x]` done

---

## Setup & Infrastructure
- [x] Initialize Node.js project
- [x] Create Supabase schema SQL
- [x] Build all core server modules
- [x] Create seed data SQL
- [ ] Create Supabase project and run `schema.sql`
- [ ] Configure `.env` with real API keys (Twilio, Anthropic, Supabase, OpenAI)
- [ ] Resolve Anthropic model availability issue (`claude-sonnet-4-20250514` returns 404)
- [ ] Set up Twilio WhatsApp sandbox
- [ ] Run `seed.sql` and generate embeddings for seed entities

## Testing & Validation
- [ ] Test webhook endpoint locally (e.g. with ngrok + Twilio sandbox)
- [ ] Test reader flow end-to-end (WhatsApp → search → results)
- [ ] Test poster flow end-to-end (WhatsApp → intake → saved entity)
- [ ] Test session timeout/reset behavior
- [ ] Test intent detection edge cases (ambiguous messages)

## Deployment
- [ ] Deploy to Railway or Render
- [ ] Point Twilio webhook URL to production server
- [ ] Verify production WhatsApp flow works

## Future (Post-MVP)
- [ ] Add edit/remove flow for existing listings
- [ ] WhatsApp group ingestion pipeline
- [ ] Web directory (Next.js)
- [ ] Media support (photos via WhatsApp)
