import { pgTable, text, timestamp, integer, boolean, primaryKey, index } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  excerpt: text().notNull(),
  content: text().notNull(),
  category: text().notNull(),
  author: text().notNull(),
  cover: text().notNull(),
  status: text().notNull().default('draft'),
  featured: boolean().notNull().default(false),
  sample: boolean().notNull().default(false),
  readMinutes: integer('read_minutes').notNull().default(5),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('posts_status_date_idx').on(table.status, table.publishedAt)]);

export const comments = pgTable('comments', {
  id: text().primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  author: text().notNull(),
  body: text().notNull(),
  status: text().notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('comments_post_status_idx').on(table.postId, table.status)]);

export const bookmarks = pgTable('bookmarks', {
  userId: text('user_id').notNull(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.postId] })]);

export const subscribers = pgTable('subscribers', {
  id: text().primaryKey(),
  email: text().notNull().unique(),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull().defaultNow(),
  unsubscribeHash: text('unsubscribe_hash').notNull(),
});

export const messages = pgTable('messages', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  subject: text().notNull(),
  body: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text().primaryKey(),
  count: integer().notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
