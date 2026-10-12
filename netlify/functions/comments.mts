import type { Config } from '@netlify/functions';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { comments, posts } from '../../db/schema.js';
import { commentInput } from '../../src/lib/validation';
import { handleError, HttpError, identity, rateLimit, readBody, response } from '../../src/lib/server';

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      if (url.searchParams.get('admin') === 'true') {
        await identity(true);
        return response({ comments: await db.select({ id: comments.id, postId: comments.postId, author: comments.author, body: comments.body, status: comments.status, createdAt: comments.createdAt, title: posts.title }).from(comments).innerJoin(posts, eq(posts.id, comments.postId)).orderBy(desc(comments.createdAt)).limit(200) });
      }
      const postId = url.searchParams.get('postId');
      if (!postId) throw new HttpError(400, 'Article ID is required.');
      const data = await db.select({ id: comments.id, author: comments.author, body: comments.body, createdAt: comments.createdAt }).from(comments).innerJoin(posts, eq(comments.postId, posts.id)).where(and(eq(comments.postId, postId), eq(comments.status, 'approved'), eq(posts.status, 'published'))).orderBy(desc(comments.createdAt)).limit(100);
      return response({ comments: data });
    }
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    const user = await identity(request.method !== 'POST');
    const body = await readBody(request);
    if (request.method === 'POST') {
      const values = commentInput.parse(body);
      await rateLimit('comments', user.id, 12);
      const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, values.postId), eq(posts.status, 'published')));
      if (!post) throw new HttpError(404, 'Article not found.');
      await db.insert(comments).values({ ...values, id: crypto.randomUUID(), userId: user.id, author: (user.name || 'O2 reader').slice(0, 100) });
      return response({ message: 'Your comment is waiting for editorial approval.' }, 201);
    }
    if (typeof body.id !== 'string') throw new HttpError(400, 'Comment ID is required.');
    if (request.method === 'DELETE') await db.delete(comments).where(eq(comments.id, body.id));
    else {
      if (!['approved', 'rejected', 'pending'].includes(body.status)) throw new HttpError(400, 'Invalid status.');
      await db.update(comments).set({ status: body.status }).where(eq(comments.id, body.id));
    }
    return response({ success: true });
  } catch (error) { return handleError(error); }
};

export const config: Config = { path: '/api/comments' };
