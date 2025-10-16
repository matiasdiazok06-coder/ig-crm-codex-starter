import { prisma } from '../lib/prisma.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { graph } from '../lib/graph.js';
import { tokenQueue } from '../queues/index.js';
import { CONFIG } from '../config.js';

const REFRESH_OFFSET_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function storeUserToken({ accessToken, expiresIn }) {
  const tokenEnc = encryptToken(accessToken);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  const token = await prisma.oAuthToken.create({
    data: {
      kind: 'user',
      tokenEnc,
      expiresAt,
    },
  });
  await scheduleTokenRefresh(token.id, expiresAt);
  return token;
}

export async function storePageToken({ accountId, accessToken, expiresAt = null }) {
  const tokenEnc = encryptToken(accessToken);
  await prisma.oAuthToken.deleteMany({ where: { accountId, kind: 'page' } });
  return prisma.oAuthToken.create({
    data: {
      accountId,
      kind: 'page',
      tokenEnc,
      expiresAt,
    },
  });
}

export async function scheduleTokenRefresh(tokenId, expiresAt) {
  if (!expiresAt) return;
  const delay = Math.max(0, expiresAt.getTime() - Date.now() - REFRESH_OFFSET_MS);
  await tokenQueue.add(
    'refresh',
    { tokenId },
    { delay, jobId: `token:${tokenId}`, removeOnComplete: true }
  );
}

export async function refreshLongLivedToken(tokenId) {
  const token = await prisma.oAuthToken.findUnique({ where: { id: tokenId } });
  if (!token) {
    return { status: 'missing' };
  }
  const current = decryptToken(token.tokenEnc);
  const refreshed = await graph('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: CONFIG.appId,
    client_secret: CONFIG.appSecret,
    fb_exchange_token: current,
  });
  const { access_token: newAccessToken, expires_in: expiresIn } = refreshed;
  const newTokenEnc = encryptToken(newAccessToken);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  await prisma.oAuthToken.update({
    where: { id: tokenId },
    data: {
      tokenEnc: newTokenEnc,
      expiresAt,
    },
  });
  await scheduleTokenRefresh(tokenId, expiresAt);
  return { status: 'refreshed' };
}

export async function getUserAccessTokenFromSession(session) {
  if (!session?.userTokenId) return null;
  const token = await prisma.oAuthToken.findUnique({ where: { id: session.userTokenId } });
  if (!token) return null;
  return decryptToken(token.tokenEnc);
}
