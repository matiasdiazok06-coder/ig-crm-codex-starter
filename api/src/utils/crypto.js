import crypto from 'crypto';
import { CONFIG } from '../config.js';

const KEY = Buffer.from(CONFIG.tokenEncryptionKey, 'utf8');
if (KEY.length !== 32) {
  console.warn('TOKEN_ENC_KEY must be 32 bytes for AES-256-GCM encryption.');
}

export function encryptToken(token) {
  if (!token) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptToken(tokenEnc) {
  if (!tokenEnc) return null;
  const data = Buffer.from(tokenEnc, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const text = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString('utf8');
}
