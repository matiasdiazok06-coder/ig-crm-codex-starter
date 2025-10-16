import 'dotenv/config';

const required = [
  'META_APP_ID',
  'META_APP_SECRET',
  'META_REDIRECT_URI',
  'META_APP_VERIFY_TOKEN',
  'META_API_VERSION',
  'SESSION_SECRET',
  'TOKEN_ENC_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'WEB_ORIGIN'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`Missing required env vars: ${missing.join(', ')}`);
}

export const CONFIG = {
  port: Number(process.env.PORT || 4000),
  apiVersion: process.env.META_API_VERSION || 'v20.0',
  appId: process.env.META_APP_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
  redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:4000/auth/callback',
  verifyToken: process.env.META_APP_VERIFY_TOKEN || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret',
  tokenEncryptionKey: process.env.TOKEN_ENC_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
};
