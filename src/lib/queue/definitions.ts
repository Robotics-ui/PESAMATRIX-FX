// filename: src/lib/queue/definitions.ts
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

export const accountSyncQueue = new Queue('account-sync', { connection: { url: redisConnection.url } });
export const copyTradeQueue = new Queue('copy-trade', { connection: { url: redisConnection.url } });
export const providerEventQueue = new Queue('provider-event', { connection: { url: redisConnection.url } });
export const notificationQueue = new Queue('notification', { connection: { url: redisConnection.url } });
export const analyticsQueue = new Queue('analytics', { connection: { url: redisConnection.url } });
export const slaveMonitorQueue = new Queue('slave-monitor', { connection: { url: redisConnection.url } });
export const backupQueue = new Queue('backup', { connection: { url: redisConnection.url } });

export const allQueues = [
  accountSyncQueue,
  copyTradeQueue,
  providerEventQueue,
  notificationQueue,
  analyticsQueue,
  slaveMonitorQueue,
  backupQueue
];
