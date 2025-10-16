import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import bodyParser from 'body-parser';
import validator from 'validator';
import fetch from 'node-fetch';

import { CONFIG } from './config.js';
import { prisma } from './lib/prisma.js';
import { graph } from './lib/graph.js';
import { encryptToken, decryptToken } from './utils/crypto.js';
import { webhookQueue, sendQueue } from './queues/index.js';
import { handleIncomingWebhook } from './services/webhook.js';
import {
  storeUserToken,
  storePageToken,
  getUserAccessTokenFromSession,
} from './services/tokens.js';

function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return validator.trim(value);
}

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(
    cors({
      origin: CONFIG.webOrigin,
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(
    session({
      secret: CONFIG.sessionSecret,
      resave: false,
      saveUninitialized: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/auth/login', (req, res) => {
    const scopes = [
      'instagram_manage_messages',
      'instagram_basic',
      'pages_manage_metadata',
      'pages_show_list',
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/dialog/oauth');
    authUrl.searchParams.set('client_id', CONFIG.appId);
    authUrl.searchParams.set('redirect_uri', CONFIG.redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', req.sessionID);

    res.redirect(authUrl.toString());
  });

  app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    if (error) {
      return res.status(400).send(`OAuth error: ${error}`);
    }
    if (!code) {
      return res.status(400).send('Missing code');
    }

    try {
      const tokenUrl = new URL('https://graph.facebook.com/oauth/access_token');
      tokenUrl.searchParams.set('client_id', CONFIG.appId);
      tokenUrl.searchParams.set('client_secret', CONFIG.appSecret);
      tokenUrl.searchParams.set('redirect_uri', CONFIG.redirectUri);
      tokenUrl.searchParams.set('code', code);

      const shortResp = await fetch(tokenUrl);
      const shortJson = await shortResp.json();
      if (!shortResp.ok) {
        throw new Error(shortJson.error?.message || 'Error exchanging code');
      }

      const { access_token: shortToken } = shortJson;
      const longJson = await graph('/oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: CONFIG.appId,
        client_secret: CONFIG.appSecret,
        fb_exchange_token: shortToken,
      });

      const {
        access_token: longToken,
        expires_in: expiresIn,
      } = longJson;

      const userToken = await storeUserToken({ accessToken: longToken, expiresIn });
      req.session.userTokenId = userToken.id;
      req.session.userTokenEnc = userToken.tokenEnc;
      req.session.fbAccessToken = decryptToken(userToken.tokenEnc);

      res.redirect(`${CONFIG.webOrigin}/connect`);
    } catch (e) {
      console.error('OAuth callback error', e);
      res.status(500).send('Error intercambiando token.');
    }
  });

  app.get('/me/accounts', async (req, res) => {
    try {
      const token = await getUserAccessTokenFromSession(req.session);
      if (!token) {
        return res.status(401).json({ error: 'Falta login' });
      }
      const data = await graph(
        '/me/accounts',
        {
          fields:
            'name,id,access_token,instagram_business_account{id,username,is_message_access_enabled}',
          limit: '500',
        },
        { accessToken: token }
      );
      const normalized = (data.data || [])
        .filter((page) => page.instagram_business_account?.id)
        .map((page) => ({
          pageId: page.id,
          pageName: page.name,
          igUserId: page.instagram_business_account.id,
          igUsername: page.instagram_business_account.username,
          isMessageAccessEnabled:
            page.instagram_business_account.is_message_access_enabled ?? null,
        }));
      res.json(normalized);
    } catch (e) {
      console.error('Error loading accounts', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/accounts/connect', async (req, res) => {
    try {
      const body = Array.isArray(req.body) ? req.body : req.body.accounts;
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const token = await getUserAccessTokenFromSession(req.session);
      if (!token) {
        return res.status(401).json({ error: 'Falta login' });
      }

      const data = await graph(
        '/me/accounts',
        {
          fields:
            'name,id,access_token,instagram_business_account{id,username,is_message_access_enabled}',
          limit: '500',
        },
        { accessToken: token }
      );

      const pageMap = new Map();
      for (const page of data.data || []) {
        if (!page.instagram_business_account?.id) continue;
        pageMap.set(page.instagram_business_account.id, page);
      }

      const connected = [];
      const warnings = [];

      for (const item of body) {
        const igUserId = sanitizeString(item.igUserId);
        const igUsername = sanitizeString(item.igUsername);
        const pageId = sanitizeString(item.pageId);
        if (!igUserId || !pageId) continue;

        const page = pageMap.get(igUserId);
        if (!page || page.id !== pageId) {
          warnings.push({ igUserId, reason: 'not_authorized' });
          continue;
        }
        const pageToken = page.access_token;
        if (!pageToken) {
          warnings.push({ igUserId, reason: 'missing_page_token' });
          continue;
        }

        const account = await prisma.account.upsert({
          where: { igUserId },
          update: {
            username: igUsername || page.instagram_business_account.username,
            pageId: page.id,
            pageName: page.name,
            accessTokenEnc: encryptToken(pageToken),
            connectedAt: new Date(),
          },
          create: {
            igUserId,
            username: igUsername || page.instagram_business_account.username,
            pageId: page.id,
            pageName: page.name,
            accessTokenEnc: encryptToken(pageToken),
          },
        });

        await storePageToken({ accountId: account.id, accessToken: pageToken });

        if (page.instagram_business_account.is_message_access_enabled === false) {
          warnings.push({
            igUserId,
            reason: 'message_access_disabled',
          });
        }

        connected.push({
          id: account.id,
          igUserId,
          igUsername: account.username,
          pageId: account.pageId,
        });
      }

      res.json({ connected, warnings });
    } catch (e) {
      console.error('Connect accounts error', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/accounts', async (_req, res) => {
    const accounts = await prisma.account.findMany({
      orderBy: { username: 'asc' },
    });
    res.json(
      accounts.map((account) => ({
        id: account.id,
        igUserId: account.igUserId,
        igUsername: account.username,
        pageId: account.pageId,
        pageName: account.pageName,
        connectedAt: account.connectedAt,
      }))
    );
  });

  app.get('/conversations', async (req, res) => {
    const { igUserId, q = '', page = '1' } = req.query;
    const pageNumber = Number(page) || 1;
    const pageSize = 20;
    const where = {};
    if (igUserId) {
      const account = await prisma.account.findUnique({ where: { igUserId } });
      if (!account) {
        return res.json({ data: [], nextPage: null });
      }
      where.accountId = account.id;
    }
    if (q) {
      where.OR = [
        { peerIgUsername: { contains: String(q), mode: 'insensitive' } },
        { peerIgUserId: { contains: String(q), mode: 'insensitive' } },
        { lastMessageSnippet: { contains: String(q), mode: 'insensitive' } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize + 1,
    });
    const hasMore = conversations.length > pageSize;
    const data = conversations.slice(0, pageSize);
    res.json({
      data: data.map((conversation) => ({
        id: conversation.id,
        accountId: conversation.accountId,
        peerIgUserId: conversation.peerIgUserId,
        peerIgUsername: conversation.peerIgUsername,
        lastMessageAt: conversation.lastMessageAt,
        lastMessageSnippet: conversation.lastMessageSnippet,
        unreadCount: conversation.unreadCount,
      })),
      nextPage: hasMore ? pageNumber + 1 : null,
    });
  });

  app.get('/messages', async (req, res) => {
    const { conversationId, page = '1' } = req.query;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId requerido' });
    }
    const pageNumber = Number(page) || 1;
    const pageSize = 30;
    const messages = await prisma.message.findMany({
      where: { conversationId: String(conversationId) },
      orderBy: { createdAt: 'asc' },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize + 1,
    });
    const hasMore = messages.length > pageSize;
    const data = messages.slice(0, pageSize);
    res.json({
      data: data.map((message) => ({
        id: message.id,
        direction: message.direction,
        text: message.text,
        igMessageId: message.igMessageId,
        createdAt: message.createdAt,
      })),
      nextPage: hasMore ? pageNumber + 1 : null,
    });
  });

  app.post('/messages/send', async (req, res) => {
    try {
      const { igUserId, peerIgUserId, text } = req.body || {};
      if (!igUserId || !peerIgUserId || !text) {
        return res.status(400).json({ error: 'Parámetros requeridos' });
      }
      const account = await prisma.account.findUnique({ where: { igUserId: sanitizeString(igUserId) } });
      if (!account) {
        return res.status(404).json({ error: 'Cuenta no conectada' });
      }

      await sendQueue.add(
        'send',
        {
          accountId: account.id,
          igUserId: account.igUserId,
          peerIgUserId: sanitizeString(peerIgUserId),
          text: sanitizeString(text),
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
        }
      );

      res.json({ status: 'queued' });
    } catch (e) {
      console.error('Send message error', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/webhooks/meta', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === CONFIG.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  app.post('/webhooks/meta', async (req, res) => {
    res.sendStatus(200);
    await webhookQueue.add('incoming', req.body, { removeOnComplete: true });
  });

  // Background queue handlers
  webhookQueue.on('error', (err) => console.error('Webhook queue error', err));
  sendQueue.on('error', (err) => console.error('Send queue error', err));

  return app;
}

export async function processWebhookPayload(payload) {
  return handleIncomingWebhook(payload);
}
