import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import pkg from 'twilio';
const { twiml: Twiml } = pkg;

import { getSession, updateSession, appendHistory } from './session.js';
import { chat, validateAnthropicModel } from './claude.js';
import { handleReader } from './flows/reader.js';
import { handlePoster } from './flows/poster.js';

const app = express();
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_API_TOKEN || process.env.META_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

console.log('Loaded WhatsApp env:', {
  hasVerifyToken: Boolean(META_VERIFY_TOKEN),
  hasAppSecret: Boolean(META_APP_SECRET),
  hasWhatsAppToken: Boolean(WHATSAPP_TOKEN),
  hasPhoneNumberId: Boolean(WHATSAPP_PHONE_NUMBER_ID),
  source: {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'WHATSAPP_VERIFY_TOKEN' : process.env.META_VERIFY_TOKEN ? 'META_VERIFY_TOKEN' : 'missing',
    appSecret: process.env.WHATSAPP_APP_SECRET ? 'WHATSAPP_APP_SECRET' : process.env.META_APP_SECRET ? 'META_APP_SECRET' : 'missing',
    token: process.env.WHATSAPP_API_TOKEN ? 'WHATSAPP_API_TOKEN' : process.env.WHATSAPP_TOKEN ? 'WHATSAPP_TOKEN' : process.env.META_ACCESS_TOKEN ? 'META_ACCESS_TOKEN' : 'missing',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 'WHATSAPP_PHONE_NUMBER_ID' : process.env.META_PHONE_NUMBER_ID ? 'META_PHONE_NUMBER_ID' : 'missing',
  },
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'ZimRoots Alpha v0' });
});

function verifyMetaSignature(req, signature) {
  if (!META_APP_SECRET || !signature || !req.rawBody) {
    return !META_APP_SECRET; // allow local dev without secret
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(req.rawBody)
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function handleMetaVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge || ''));
  }

  return res.status(403).send('Verification failed');
}

function sendTwimlMessage(res, reply) {
  const twimlResponse = new Twiml.MessagingResponse();
  twimlResponse.message(reply);
  res.type('text/xml').send(twimlResponse.toString());
}

async function sendMetaTextMessage(phone, message) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
  }

  const response = await fetch(`https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        body: message,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

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

  // Twilio webhooks must respond with TwiML.
  sendTwimlMessage(res, reply);
}

function extractMetaMessage(payload) {
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return { from: null, body: null };

  return {
    from: message.from,
    body: message?.text?.body?.trim() || null,
  };
}

async function handleMetaWebhook(req, res) {
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];

  if (META_APP_SECRET && !verifyMetaSignature(req, signature)) {
    console.error('Meta webhook signature mismatch', {
      received: signature,
      rawBody: req.rawBody ? req.rawBody.toString().slice(0, 300) : '<missing raw body>',
    });
    return res.status(403).send('Invalid WhatsApp signature');
  }

  const payload = req.body || {};
  const { from, body } = extractMetaMessage(payload);

  if (!from || !body) {
    console.error('Meta WhatsApp webhook payload missing message data:', JSON.stringify(payload, null, 2));
    return res.status(400).send('Missing WhatsApp message payload');
  }

  console.log(`[${from}] ${body}`);

  let reply;
  try {
    reply = await handleMessage(from, body);
  } catch (err) {
    console.error(`[${from}] Error:`, err);
    reply = "Sorry, something went wrong on my end. Please try again in a moment.";
  }

  console.log(`[${from}] → ${reply}`);

  try {
    await sendMetaTextMessage(from, reply);
    console.log(`[${from}] sent via Meta WhatsApp API`);
    return res.status(200).send('OK');
  } catch (error) {
    console.error(`[${from}] Meta send failed:`, error);
    return res.status(500).send('WhatsApp send failed');
  }
}

// Twilio-compatible WhatsApp webhook
app.post('/webhook', handleWebhook);

// Meta verification challenge and incoming webhook callbacks
app.get('/whatsapp', handleMetaVerify);
app.get('/webhook/whatsapp', handleMetaVerify);
app.post('/whatsapp', handleMetaWebhook);
app.post('/webhook/whatsapp', handleMetaWebhook);

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
