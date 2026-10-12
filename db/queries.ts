import { sql } from 'drizzle-orm';
import { posts } from './schema.js';

export const postSummary = {
  id: posts.id, slug: posts.slug, title: posts.title, excerpt: posts.excerpt,
  category: posts.category, author: posts.author, cover: posts.cover,
  status: posts.status, featured: posts.featured, sample: posts.sample,
  readMinutes: posts.readMinutes, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt,
  content: sql<string>`''`,
};
