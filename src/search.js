import supabase from './supabase.js';
import { generateEmbedding } from './embed.js';

/**
 * Search across all entity tables using vector similarity.
 * Returns top matches with entity type, name, description, etc.
 */
export async function searchAll(queryText, limit = 5) {
  const embedding = await generateEmbedding(queryText);

  const { data, error } = await supabase.rpc('search_all_entities', {
    query_embedding: embedding,
    match_count: limit,
  });

  if (error) throw error;
  return data;
}

/**
 * Search a specific entity table.
 */
export async function searchTable(tableName, queryText, limit = 5) {
  const embedding = await generateEmbedding(queryText);

  const { data, error } = await supabase.rpc('search_entities', {
    target_table: tableName,
    query_embedding: embedding,
    match_count: limit,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch full entity details by id and table name.
 */
export async function getEntityDetails(tableName, id) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*, users(name, phone)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch full details for search results (enriches with contact info).
 */
export async function enrichResults(results) {
  const enriched = [];

  for (const result of results) {
    // Map entity_type to table name (pluralize)
    const tableMap = {
      business: 'businesses',
      product: 'products',
      service: 'services',
      event: 'events',
      job: 'jobs',
    };
    const table = tableMap[result.entity_type];
    if (!table) continue;

    try {
      const details = await getEntityDetails(table, result.id);
      enriched.push({
        ...result,
        details,
      });
    } catch {
      // Skip entities we can't fetch
      enriched.push(result);
    }
  }

  return enriched;
}
