import IORedis from 'ioredis';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { CONFIG } from '../config.js';

export const connection = new IORedis(CONFIG.redisUrl);

export const webhookQueue = new Queue('webhook-events', { connection });
export const sendQueue = new Queue('send-messages', { connection });
export const tokenQueue = new Queue('token-refresh', { connection });

new QueueScheduler('webhook-events', { connection });
new QueueScheduler('send-messages', { connection });
new QueueScheduler('token-refresh', { connection });

export function registerWorkers({ handleWebhook, handleSendMessage, handleTokenRefresh }) {
  if (handleWebhook) {
    new Worker('webhook-events', async (job) => handleWebhook(job.data), { connection });
  }
  if (handleSendMessage) {
    new Worker('send-messages', async (job) => handleSendMessage(job.data), {
      connection,
      settings: {
        backoffStrategies: {
          exponential: (attemptsMade) => Math.pow(2, attemptsMade - 1) * 1000,
        },
      },
    });
  }
  if (handleTokenRefresh) {
    new Worker('token-refresh', async (job) => handleTokenRefresh(job.data), { connection });
  }
}
