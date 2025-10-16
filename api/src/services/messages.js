import { prisma } from '../lib/prisma.js';
import { graph } from '../lib/graph.js';
import { decryptToken } from '../utils/crypto.js';

function toDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const num = Number(value);
  if (!Number.isNaN(num)) {
    return new Date(num);
  }
  return new Date(value);
}

export async function persistMessage({
  account,
  peerIgUserId,
  peerIgUsername,
  direction,
  igMessageId,
  text,
  senderIgUserId,
  timestamp,
  markAsRead = false,
}) {
  if (!account) {
    throw new Error('Account is required to persist a message');
  }
  if (!igMessageId) {
    throw new Error('igMessageId is required');
  }

  const existing = await prisma.message.findUnique({ where: { igMessageId } });
  if (existing) {
    return { status: 'duplicate', messageId: existing.id };
  }

  const messageTimestamp = toDate(timestamp);

  const conversation = await prisma.conversation.upsert({
    where: {
      accountId_peerIgUserId: {
        accountId: account.id,
        peerIgUserId,
      },
    },
    update: {
      peerIgUsername: peerIgUsername ?? undefined,
      lastMessageAt: messageTimestamp,
      lastMessageSnippet: text ?? undefined,
      unreadCount:
        direction === 'in' && !markAsRead
          ? { increment: 1 }
          : undefined,
    },
    create: {
      accountId: account.id,
      peerIgUserId,
      peerIgUsername,
      lastMessageAt: messageTimestamp,
      lastMessageSnippet: text ?? undefined,
      unreadCount: direction === 'in' && !markAsRead ? 1 : 0,
    },
  });

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction,
      igMessageId,
      text,
      senderIgUserId,
      createdAt: messageTimestamp,
    },
  });

  if (direction === 'out') {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unreadCount: 0,
      },
    });
  }

  return { status: 'stored', messageId: message.id };
}

export async function sendInstagramMessage({ account, igUserId, peerIgUserId, text }) {
  if (!text) {
    throw new Error('Text is required');
  }
  const accessToken = decryptToken(account.accessTokenEnc);
  if (!accessToken) {
    throw new Error('Account missing access token');
  }

  const payload = {
    messaging_type: 'RESPONSE',
    recipient: { id: peerIgUserId },
    message: { text },
  };

  const response = await graph(`/${igUserId}/messages`, payload, {
    method: 'POST',
    accessToken,
  });

  return response;
}
