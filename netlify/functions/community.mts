import type { Config, Context } from '@netlify/functions';
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bookmarks, posts, subscribers, messages } from '../../db/schema.js';
import { postSummary } from '../../db/queries.js';
import { contactInput, subscriptionInput } from '../../src/lib/validation';
import { handleError, HttpError, identity, rateLimit, readBody, response } from '../../src/lib/server';

export default async (request: Request, context: Context) => {
  try {
    const action = new URL(request.url).pathname.split('/').pop();
    if (action === 'bookmarks') {
      const user = await identity();
      if (request.method === 'GET') {
        const data = await db.select({ post: postSummary }).from(bookmarks).innerJoin(posts, eq(bookmarks.postId, posts.id)).where(and(eq(bookmarks.userId, user.id), eq(posts.status, 'published'))).orderBy(desc(bookmarks.createdAt)).limit(1000);
        return response({ posts: data.map((item) => item.post) });
      }
      if (!['POST', 'DELETE'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
      const body = await readBody(request);
      if (typeof body.postId !== 'string') throw new HttpError(400, 'Article ID is required.');
      if (request.method === 'DELETE') await db.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.postId, body.postId)));
      else {
        const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, body.postId), eq(posts.status, 'published')));
        if (!post) throw new HttpError(404, 'Article not found.');
        await db.insert(bookmarks).values({ userId: user.id, postId: body.postId }).onConflictDoNothing();
      }
      return response({ success: true });
    }
    if (request.method === 'DELETE' && ['subscribers', 'messages'].includes(action || '')) {
      await identity(false, true);
      const body = await readBody(request);
      if (typeof body.id !== 'string') throw new HttpError(400, 'Record ID is required.');
      if (action === 'subscribers') await db.delete(subscribers).where(eq(subscribers.id, body.id));
      else await db.delete(messages).where(eq(messages.id, body.id));
      return response({ success: true });
    }
    if (request.method === 'GET' && ['subscribers', 'messages'].includes(action || '')) {
      await identity(false, true);
      return action === 'messages'
        ? response({ messages: await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(200) })
        : response({ subscribers: await db.select({ id: subscribers.id, email: subscribers.email, consentAt: subscribers.consentAt }).from(subscribers).orderBy(desc(subscribers.consentAt)).limit(10000) });
    }
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const body = await readBody(request);
    await rateLimit(action || 'community', context.ip || 'unknown', 15);
    if (action === 'subscribe') {
      const values = subscriptionInput.parse(body);
      const token = randomBytes(32).toString('hex');
      const inserted = await db.insert(subscribers).values({ id: crypto.randomUUID(), email: values.email, unsubscribeHash: createHash('sha256').update(token).digest('hex') }).onConflictDoNothing().returning({ id: subscribers.id });
      return response({ message: 'Thank you! Your interest in O2 Media updates has been recorded.', manageUrl: inserted.length ? `/unsubscribe?token=${token}` : null });
    }
    if (action === 'unsubscribe') {
      if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) throw new HttpError(400, 'Invalid unsubscribe link.');
      await db.delete(subscribers).where(eq(subscribers.unsubscribeHash, createHash('sha256').update(body.token).digest('hex')));
      return response({ message: 'Your subscription has been removed.' });
    }
    if (action === 'contact') {
      const { website, ...values } = contactInput.parse(body);
      await db.insert(messages).values({ ...values, id: crypto.randomUUID() });
      return response({ message: 'Message received. The O2 Media team can now read it in the dashboard.' }, 201);
    }
    throw new HttpError(404, 'Not found.');
  } catch (error) { return handleError(error); }
};

export const config: Config = { path: ['/api/bookmarks', '/api/subscribers', '/api/messages', '/api/subscribe', '/api/unsubscribe', '/api/contact'] };
