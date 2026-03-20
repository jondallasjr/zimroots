import { chat } from '../claude.js';
import { searchAll, enrichResults } from '../search.js';
import { updateSession, appendHistory } from '../session.js';

/**
 * Handle a reader query: embed → search → Claude formats results.
 */
export async function handleReader(session, userMessage) {
  // Step 1: Ask Claude to extract the search intent
  const intentResponse = await chat(session.history || [], userMessage, {
    sessionState: session.state,
  });

  // Step 2: If Claude requests a search, run it
  let reply;
  if (intentResponse.action?.type === 'SEARCH') {
    const query = intentResponse.action.query || userMessage;
    const results = await searchAll(query);
    const enriched = await enrichResults(results);

    // Step 3: Send results back to Claude for formatting
    const formatted = await chat(session.history || [], userMessage, {
      sessionState: 'READER_RESULTS',
      searchResults: enriched,
    });

    reply = formatted.reply;
  } else {
    // Claude didn't request a search — use its direct reply
    reply = intentResponse.reply;
  }

  // Update session
  await appendHistory(session.phone, session.history || [], userMessage, reply);

  return reply;
}
