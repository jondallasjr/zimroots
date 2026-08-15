import 'dotenv/config';
import express from 'express';
import pkg from 'twilio';
const { twiml: Twiml } = pkg;

import { getSession, updateSession, appendHistory } from './session.js';
import { chat, validateAnthropicModel } from './claude.js';
import { handleReader } from './flows/reader.js';
import { handlePoster } from './flows/poster.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'ZimRoots Alpha v0' });
});

async function handleWebhook(req, res) {
  console.log('Webhook headers:', req.headers);
  console.log('Webhook body:', req.body);
  const from = req.body.From;   // e.g. "whatsapp:+2637XXXXXXXX"
  const body = req.body.Body?.trim();

  if (!from || !body) {
    return res.status(400).send('Missing From or Body');
  }

  // Extract phone number from Twilio format
  const phone = from.replace('whatsapp:', '');

  console.log(`[${phone}] ${body}`);

  let reply;
  try {
    reply = await handleMessage(phone, body);
  } catch (err) {
    console.error(`[${phone}] Error:`, err);
    reply = "Sorry, something went wrong on my end. Please try again in a moment.";
  }

  console.log(`[${phone}] → ${reply}`);

  // Send reply via TwiML
  const twimlResponse = new Twiml.MessagingResponse();
  twimlResponse.message(reply);
  res.type('text/xml').send(twimlResponse.toString());
}

// Twilio WhatsApp webhook
app.post('/webhook', handleWebhook);
app.post('/webhook/whatsapp', handleWebhook);

/**
 * Main message router.
 * Determines whether to route to reader flow, poster flow, or ask Claude for intent.
 */
async function handleMessage(phone, message) {
  const session = await getSession(phone);

  // If user is in an active poster flow, continue it
  if (session.state.startsWith('POSTER_')) {
    return handlePoster(session, message);
  }

  // If user is in an active reader follow-up
  if (session.state === 'READER_RESULTS') {
    return handleReader(session, message);
  }

  // Fresh or idle session — ask Claude to detect intent
  const response = await chat(session.history || [], message, {
    sessionState: session.state,
    isRegistered: !!session.user_id,
  });

  const action = response.action;

  // Route based on Claude's detected intent
  if (action?.type === 'SEARCH') {
    await updateSession(phone, { state: 'READER_QUERY' });
    return handleReader(session, message);
  }

  if (action?.type === 'SET_STATE' && action.state?.startsWith('POSTER_')) {
    await updateSession(phone, {
      state: action.state,
      buffer: action.buffer || {},
    });
    return handlePoster(session, message);
  }

  if (action?.type === 'REGISTER') {
    await updateSession(phone, { state: 'POSTER_REGISTER' });
    return handlePoster(session, message);
  }

  // Default: return Claude's reply (greeting, disambiguation, etc.)
  await appendHistory(phone, session.history || [], message, response.reply);
  return response.reply;
}

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const { model } = await validateAnthropicModel();
    console.log(`Anthropic model validated: ${model}`);
    app.listen(PORT, () => {
      console.log(`ZimRoots server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Anthropic configuration error:', error.message);
    process.exit(1);
  }
}

startServer();
