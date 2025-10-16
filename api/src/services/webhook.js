import { prisma } from '../lib/prisma.js';
import { persistMessage } from './messages.js';

export function extractInstagramEvents(payload) {
  const events = [];
  if (!payload || payload.object !== 'instagram') {
    return events;
  }
  for (const entry of payload.entry ?? []) {
    if (Array.isArray(entry.messaging)) {
      for (const item of entry.messaging) {
        const igUserId = item.recipient?.id;
        const peerIgUserId = item.sender?.id;
        const messageId = item.message?.mid || item.message?.id;
        if (!igUserId || !peerIgUserId || !messageId) continue;
        events.push({
          igUserId,
          peerIgUserId,
          messageId,
          text: item.message?.text ?? null,
          timestamp: item.timestamp,
          peerIgUsername: item.sender?.username,
        });
      }
    }
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        if (!value) continue;
        const messages = value.messages ?? (value.message ? [value.message] : []);
        for (const message of messages) {
          const igUserId = value.recipient?.id || value.to?.id || value.metadata?.instagram_business_account_id;
          const peerIgUserId = message.from?.id || value.from?.id;
          const messageId = message.id || message.mid;
          if (!igUserId || !peerIgUserId || !messageId) continue;
          events.push({
            igUserId,
            peerIgUserId,
            messageId,
            text: message.text ?? message.message ?? null,
            timestamp: message.timestamp || value.timestamp || entry.time,
            peerIgUsername: message.from?.username ?? value.from?.username,
          });
        }
      }
    }
  }
  return events;
}

export async function handleIncomingWebhook(payload) {
  const events = extractInstagramEvents(payload);
  const results = [];
  for (const event of events) {
    const account = await prisma.account.findUnique({ where: { igUserId: event.igUserId } });
    if (!account) {
      results.push({ status: 'ignored', reason: 'account_not_connected', event });
      continue;
    }
    try {
      const result = await persistMessage({
        account,
        peerIgUserId: event.peerIgUserId,
        peerIgUsername: event.peerIgUsername,
        direction: 'in',
        igMessageId: event.messageId,
        text: event.text,
        senderIgUserId: event.peerIgUserId,
        timestamp: event.timestamp,
      });
      results.push(result);
    } catch (error) {
      results.push({ status: 'error', error: error.message, event });
    }
  }
  return results;
}
