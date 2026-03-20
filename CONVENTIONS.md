# CONVENTIONS.md

Style guide and patterns for the ZimRoots codebase.

---

## Language & Runtime
- Node.js with ES modules (`"type": "module"` in package.json)
- All imports use `import`/`export`, not `require()`
- No TypeScript for alpha — plain JS for speed

## File Structure
```
src/           — all application code
src/flows/     — conversation flow handlers (reader, poster)
supabase/      — SQL files (schema, seed, migrations)
admin/         — CLI tools
docs/          — specs and documentation
```

## Naming
- Files: `kebab-case.js` for multi-word, `lowercase.js` for single word
- Functions: `camelCase`
- Database tables: `lowercase_plural` (e.g. `businesses`, `sessions`)
- Database columns: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Entity types in code: singular lowercase (`'business'`, `'product'`)
- Table names in code: plural lowercase (`'businesses'`, `'products'`)

## Claude API Integration
- Claude always responds with JSON: `{ "reply": "...", "action": null | {...} }`
- Action types: `SEARCH`, `SAVE`, `REGISTER`, `SET_STATE`
- System prompt lives in `src/claude.js` as a const string
- Context injected via `[SYSTEM: ...]` tags in the user message content

## Database Patterns
- All entity tables have `embedding vector(1536)` column
- `user_id` is required on all entities (ownership/accountability)
- `business_id` is nullable (individuals can post without a business)
- Sessions keyed by phone number, not user ID
- Use Supabase service key (server-side only, never exposed to client)

## Phone Numbers
- Always stored in E.164 format: `+2637XXXXXXXX`
- Twilio sends `whatsapp:+2637XXXXXXXX` — strip the `whatsapp:` prefix
