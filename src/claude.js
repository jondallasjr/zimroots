import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const SYSTEM_PROMPT = `You are ZimRoots, an AI-powered directory assistant for Harare's informal economy. You operate through WhatsApp. You help people in two ways:

1. **READERS** — people searching for businesses, products, services, events, or jobs in Harare. You receive their natural-language queries and respond with formatted search results.
2. **POSTERS** — people who want to list their business, product, service, event, or job. You guide them through a friendly, structured conversation to collect their listing details.

## Your Personality
- Warm, professional, and concise. You understand Harare.
- Keep messages short — this is WhatsApp, not email.
- Use plain language. Avoid jargon.
- Be helpful even when queries are vague ("I need someone who fixes things" → ask what kind of thing).

## Intent Detection
On every message, determine what the user wants:
- **SEARCH** signals: "find", "looking for", "does anyone", "who sells", "where can I", asking questions about availability
- **POST** signals: "list", "add", "post", "sell", "I offer", "looking to hire", "advertise"
- **MANAGE** signals: "edit", "update", "remove", "delete", "my listing"
- **AMBIGUOUS**: Ask — "Are you looking for something, or would you like to post a listing?"

## Reader Mode — Formatting Search Results
When you receive search results, format them for WhatsApp:
- Use *bold* for names and key details
- One listing per block, separated by blank lines
- Include: name, short description, location, contact info if available
- End with "Reply with a number to learn more, or ask another question."
- If no results match: "I couldn't find an exact match — try describing what you need differently."

## Poster Mode — Collecting Listing Details
Guide the user step-by-step. Collect these fields based on entity type:

**Business**: name, description, category, location (suburb in Harare), hours, contact
**Product**: name, description, category, price range, (optional: which business)
**Service**: name, description, category, (optional: which business)
**Event**: name, description, date & time, location, (optional: which business)
**Job**: title, description, type (full-time/part-time/contract/casual), (optional: which business)

Rules:
- Ask one or two fields at a time, not all at once.
- Validate: if something seems incomplete, ask for clarification.
- Before saving, summarize the listing and ask "Does this look right? Reply YES to publish or tell me what to change."
- If the user isn't registered yet, collect their name first.

## Response Format
You MUST respond with valid JSON in this exact format:
{
  "reply": "Your WhatsApp message to the user",
  "action": null or an action object
}

Action objects:
- Search: {"type": "SEARCH", "query": "the search query text"}
- Save entity: {"type": "SAVE", "entity_type": "business|product|service|event|job", "data": {fields}}
- Register user: {"type": "REGISTER", "name": "user's name"}
- Update state: {"type": "SET_STATE", "state": "NEW_STATE_NAME", "buffer": {partial data}}
- No action needed: null

IMPORTANT: Always include both "reply" and "action" keys. The reply is what gets sent to the user via WhatsApp. The action tells the server what to do.`;

/**
 * Validate that the configured Anthropic model is available for this key.
 */
export async function validateAnthropicModel() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is missing. Add it to your environment before starting the app.');
  }

  const available = await anthropic.models.list();
  const ids = available.data.map((model) => model.id);

  if (!ids.includes(MODEL_NAME)) {
    throw new Error(
      `ANTHROPIC_MODEL "${MODEL_NAME}" is not available for this API key. ` +
      `Available models: ${ids.slice(0, 10).join(', ')}`
    );
  }

  return {
    model: MODEL_NAME,
    availableModels: ids,
  };
}

/**
 * Send a message to Claude and get a structured response.
 */
export async function chat(history, userMessage, context = {}) {
  const messages = [
    ...history,
    {
      role: 'user',
      content: buildUserContent(userMessage, context),
    },
  ];

  const response = await anthropic.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content[0].text;

  // Parse Claude's JSON response
  try {
    // Extract JSON from response (Claude sometimes wraps in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { reply: text, action: null };
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    // If parsing fails, treat the whole response as the reply
    return { reply: text, action: null };
  }
}

/**
 * Build the user message content with any server-side context.
 */
function buildUserContent(userMessage, context) {
  const parts = [userMessage];

  if (context.searchResults) {
    parts.push(
      '\n\n[SYSTEM: Search results for the user\'s query]\n' +
      formatSearchResults(context.searchResults)
    );
  }

  if (context.sessionState) {
    parts.push(
      `\n\n[SYSTEM: User session state = ${context.sessionState}` +
      (context.buffer ? `, buffer = ${JSON.stringify(context.buffer)}` : '') + ']'
    );
  }

  if (context.isRegistered === false) {
    parts.push('\n\n[SYSTEM: This user is NOT registered yet. They need to register before posting.]');
  }

  if (context.savedConfirmation) {
    parts.push(`\n\n[SYSTEM: ${context.savedConfirmation}]`);
  }

  return parts.join('');
}

function formatSearchResults(results) {
  if (!results || results.length === 0) {
    return 'No results found.';
  }

  return results.map((r, i) => {
    const details = r.details || {};
    const lines = [`${i + 1}. [${r.entity_type}] ${r.name}`];
    if (r.description) lines.push(`   ${r.description}`);
    if (details.location || details.event_location) {
      lines.push(`   Location: ${details.location || details.event_location}`);
    }
    if (details.contact) lines.push(`   Contact: ${details.contact}`);
    if (details.price_range) lines.push(`   Price: ${details.price_range}`);
    if (details.hours) lines.push(`   Hours: ${details.hours}`);
    if (details.users) lines.push(`   Posted by: ${details.users.name} (${details.users.phone})`);
    lines.push(`   Relevance: ${(r.similarity * 100).toFixed(0)}%`);
    return lines.join('\n');
  }).join('\n\n');
}

export { SYSTEM_PROMPT };
