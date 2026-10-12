import type { Config } from '@netlify/functions';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { posts } from '../../db/schema.js';
import { postSummary } from '../../db/queries.js';
import { postInput } from '../../src/lib/validation';
import { handleError, HttpError, identity, readBody, response } from '../../src/lib/server';

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const admin = url.searchParams.get('admin') === 'true';
      if (admin) await identity(true);
      const id = url.searchParams.get('id');
      if (admin && id) {
        const [post] = await db.select().from(posts).where(eq(posts.id, id));
        if (!post) throw new HttpError(404, 'Article not found.');
        return response({ post });
      }
      const query = url.searchParams.get('q')?.slice(0, 150);
      const category = url.searchParams.get('category');
      const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get('offset')) || 0));
      const data = await db.select(postSummary).from(posts).where(and(
        admin ? undefined : eq(posts.status, 'published'),
        category ? eq(posts.category, category) : undefined,
        query ? or(ilike(posts.title, `%${query}%`), ilike(posts.excerpt, `%${query}%`)) : undefined,
      )).orderBy(desc(posts.publishedAt)).limit(100).offset(offset);
      return response({ posts: data, hasMore: data.length === 100 });
    }
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    await identity(true);
    const input = await readBody(request);
    if (request.method === 'DELETE') {
      if (typeof input.id !== 'string') throw new HttpError(400, 'Article ID is required.');
      const deleted = await db.delete(posts).where(eq(posts.id, input.id)).returning({ id: posts.id });
      if (!deleted.length) throw new HttpError(404, 'Article not found.');
      return response({ success: true });
    }
    const values = postInput.parse(input);
    const readMinutes = Math.max(1, Math.ceil(values.content.split(/\s+/).length / 200));
    if (request.method === 'POST') {
      const [post] = await db.insert(posts).values({ ...values, readMinutes, id: crypto.randomUUID() }).returning();
      return response({ post }, 201);
    }
    if (typeof input.id !== 'string') throw new HttpError(400, 'Article ID is required.');
    const [post] = await db.update(posts).set({ ...values, readMinutes, updatedAt: new Date() }).where(eq(posts.id, input.id)).returning();
    if (!post) throw new HttpError(404, 'Article not found.');
    return response({ post });
  } catch (error) { return handleError(error); }
};

export const config: Config = { path: '/api/posts' };
