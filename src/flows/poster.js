import supabase from '../supabase.js';
import { chat } from '../claude.js';
import { updateSession, appendHistory, linkSessionUser } from '../session.js';
import { generateEmbedding, buildEmbeddingText } from '../embed.js';

/**
 * Handle poster flow: registration, entity creation, guided intake.
 */
export async function handlePoster(session, userMessage) {
  const context = {
    sessionState: session.state,
    buffer: session.buffer,
    isRegistered: !!session.user_id,
  };

  // Ask Claude what to do next in the poster flow
  const response = await chat(session.history || [], userMessage, context);
  let reply = response.reply;
  const action = response.action;

  if (action) {
    switch (action.type) {
      case 'REGISTER':
        reply = await registerUser(session, action, reply);
        break;

      case 'SAVE':
        reply = await saveEntity(session, action, reply);
        break;

      case 'SET_STATE':
        await updateSession(session.phone, {
          state: action.state,
          buffer: action.buffer || session.buffer,
        });
        break;
    }
  }

  await appendHistory(session.phone, session.history || [], userMessage, reply);
  return reply;
}

/**
 * Register a new user from their phone number and name.
 */
async function registerUser(session, action, defaultReply) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', session.phone)
    .single();

  if (existing) {
    await linkSessionUser(session.phone, existing.id);
    return defaultReply;
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ phone: session.phone, name: action.name })
    .select()
    .single();

  if (error) {
    console.error('Failed to register user:', error);
    return "Sorry, I had trouble creating your account. Please try again.";
  }

  await linkSessionUser(session.phone, newUser.id);
  return defaultReply;
}

/**
 * Save a new entity to the database with embedding.
 */
async function saveEntity(session, action, defaultReply) {
  const { entity_type, data } = action;

  const tableMap = {
    business: 'businesses',
    product: 'products',
    service: 'services',
    event: 'events',
    job: 'jobs',
  };

  const table = tableMap[entity_type];
  if (!table) {
    console.error('Unknown entity type:', entity_type);
    return "Sorry, something went wrong. Please try again.";
  }

  // Generate embedding for semantic search
  const embeddingText = buildEmbeddingText(data);
  const embedding = await generateEmbedding(embeddingText);

  // Build the record
  const record = {
    ...data,
    user_id: session.user_id,
    embedding,
  };

  const { error } = await supabase
    .from(table)
    .insert(record);

  if (error) {
    console.error(`Failed to save ${entity_type}:`, error);
    return "Sorry, I couldn't save your listing. Please try again.";
  }

  // Reset session state after successful save
  await updateSession(session.phone, {
    state: 'IDLE',
    buffer: {},
  });

  return defaultReply || `Your ${entity_type} listing is now live! Reply EDIT to update it, or REMOVE to take it down.`;
}
