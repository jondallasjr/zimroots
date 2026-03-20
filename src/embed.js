import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

/**
 * Generate a 1536-dim embedding for a text string.
 */
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Build the text we embed for an entity.
 * Combines name + description + category into one string.
 */
export function buildEmbeddingText(entity) {
  const parts = [entity.name || entity.title];
  if (entity.description) parts.push(entity.description);
  if (entity.category) parts.push(entity.category);
  if (entity.location || entity.event_location) {
    parts.push(entity.location || entity.event_location);
  }
  return parts.join(' — ');
}
