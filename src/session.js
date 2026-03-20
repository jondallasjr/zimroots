import supabase from './supabase.js';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY = 20; // max message pairs to keep in context

/**
 * Get or create a session for a phone number.
 * Resets to IDLE if session has been inactive for 30+ minutes.
 */
export async function getSession(phone) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error && error.code === 'PGRST116') {
    // No session exists — create one
    const { data: newSession } = await supabase
      .from('sessions')
      .insert({ phone })
      .select()
      .single();
    return newSession;
  }

  if (error) throw error;

  // Reset stale sessions
  const lastUpdate = new Date(data.updated_at).getTime();
  if (Date.now() - lastUpdate > SESSION_TIMEOUT_MS) {
    return await updateSession(phone, {
      state: 'IDLE',
      buffer: {},
      history: [],
    });
  }

  return data;
}

/**
 * Update session fields for a phone number.
 */
export async function updateSession(phone, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('phone', phone)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Append a user message and assistant reply to session history.
 * Trims to MAX_HISTORY message pairs.
 */
export async function appendHistory(phone, currentHistory, userMessage, assistantReply) {
  const history = [
    ...currentHistory,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantReply },
  ];

  // Keep only the last MAX_HISTORY messages
  const trimmed = history.slice(-MAX_HISTORY * 2);

  await updateSession(phone, { history: trimmed });
}

/**
 * Link a session to a registered user.
 */
export async function linkSessionUser(phone, userId) {
  await updateSession(phone, { user_id: userId });
}
