import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import qs from 'qs';

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: true
}));

const PORT = process.env.PORT || 4000;
const API_VERSION = process.env.META_API_VERSION || 'v20.0';
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI;
const VERIFY_TOKEN = process.env.META_APP_VERIFY_TOKEN;

// Helper for Graph API calls
async function graph(path, params={}, method='GET', accessToken=null) {
  const url = new URL(`https://graph.facebook.com/${API_VERSION}${path}`);
  if (method === 'GET') {
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  }
  const headers = { 'Content-Type': 'application/json' };
  const opts = { method, headers };
  if (method !== 'GET' && params) {
    opts.body = JSON.stringify(params);
  }
  if (accessToken) {
    url.searchParams.set('access_token', accessToken);
  }
  const resp = await fetch(url.toString(), opts);
  const data = await resp.json();
  if (!resp.ok) {
    console.error('Graph error:', data);
    throw new Error(data.error?.message || 'Graph error');
  }
  return data;
}

// 1) OAuth: start login (multi-selección)
app.get('/auth/login', (req, res) => {
  const scopes = [
    'instagram_manage_messages',
    'instagram_basic',
    'pages_manage_metadata',
    'pages_show_list'
  ].join(',');

  const authUrl = new URL('https://www.facebook.com/dialog/oauth');
  authUrl.searchParams.set('client_id', APP_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', 'csrf123'); // TODO: real CSRF state
  res.redirect(authUrl.toString());
});

// 2) OAuth: callback → exchange code for access_token
app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`OAuth error: ${error}`);
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenUrl = new URL('https://graph.facebook.com/oauth/access_token');
    tokenUrl.searchParams.set('client_id', APP_ID);
    tokenUrl.searchParams.set('client_secret', APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const r = await fetch(tokenUrl.toString());
    const json = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(json));
    const { access_token } = json;

    // TODO: Persist token in DB. For demo, keep in session.
    req.session.fbAccessToken = access_token;

    res.send('Login OK. Ya podés ir a /me/accounts para listar tus IG.');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error intercambiando token.');
  }
});

// 3) Listar Páginas e IG vinculadas (una sola llamada)
app.get('/me/accounts', async (req, res) => {
  const token = req.session.fbAccessToken;
  if (!token) return res.status(401).send('Falta login');
  try {
    const data = await graph('/me/accounts', {
      fields: 'name,id,instagram_business_account{username,id}',
      limit: '500'
    }, 'GET', token);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4) Webhook verification (GET)
app.get('/webhooks/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 5) Webhook receiver (POST)
app.post('/webhooks/meta', async (req, res) => {
  // Meta enviará eventos (object=instagram, field=messages, etc.)
  // Aquí parseás y persistís mensajes/usuarios/conversaciones
  // TODO: implementar idempotencia por message.id
  console.log('Webhook received:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
