// filename: src/lib/db/schema.ts
import { pgTable, uuid, text, timestamp, integer, numeric, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'provider', 'user'] }).default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshToken: text('refresh_token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mt5Accounts = pgTable('mt5_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  metaApiAccountId: text('meta_api_account_id').unique().notNull(),
  login: text('login').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  server: text('server').notNull(),
  accountType: text('account_type', { enum: ['MASTER', 'FOLLOWER'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  durationDays: integer('duration_days').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status', { enum: ['ACTIVE', 'EXPIRED'] }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const followerAccounts = pgTable('follower_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'cascade' }).notNull(),
  lotMultiplier: numeric('lot_multiplier', { precision: 4, scale: 2 }).default('1.00').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  merchantRequestId: text('merchant_request_id').unique().notNull(),
  checkoutRequestId: text('checkout_request_id').unique().notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  mpesaReceiptNumber: text('mpesa_receipt_number'),
  status: text('status', { enum: ['PENDING', 'SUCCESS', 'FAILED'] }).default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => providers.id).notNull(),
  masterTicket: text('master_ticket').notNull(),
  symbol: text('symbol').notNull(),
  orderType: text('order_type').notNull(),
  volume: numeric('volume', { precision: 6, scale: 2 }).notNull(),
  openPrice: numeric('open_price', { precision: 12, scale: 5 }).notNull(),
  closePrice: numeric('close_price', { precision: 12, scale: 5 }),
  status: text('status', { enum: ['OPEN', 'CLOSED'] }).default('OPEN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tradeLogs = pgTable('trade_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'cascade' }).notNull(),
  followerAccountId: uuid('follower_account_id').references(() => followerAccounts.id, { onDelete: 'cascade' }).notNull(),
  followerTicket: text('follower_ticket'),
  action: text('action').notNull(), 
  status: text('status', { enum: ['SUCCESS', 'FAILED'] }).notNull(),
  errorMessage: text('error_message'),
  executedVolume: numeric('executed_volume', { precision: 6, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
