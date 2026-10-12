import { createHash } from 'node:crypto';
import { getUser } from '@netlify/identity';
import { sql, lt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { rateLimits } from '../../db/schema.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function identity(editor = false, admin = false) {
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  if (admin && !user.roles?.includes('admin')) throw new HttpError(403, 'Administrator access is required.');
  if (editor && !user.roles?.some((role) => ['admin', 'editor'].includes(role))) throw new HttpError(403, 'Editor access is required.');
  return user;
}

export async function readBody(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'This request is not allowed.');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') throw new HttpError(403, 'This request is not allowed.');
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'JSON is required.');
  if (Number(request.headers.get('content-length') || 0) > 120000) throw new HttpError(413, 'Request is too large.');
  const text = await request.text();
  if (text.length > 120000) throw new HttpError(413, 'Request is too large.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}

export async function rateLimit(scope: string, identifier: string, limit: number) {
  const bucket = Math.floor(Date.now() / 3600000);
  const key = createHash('sha256').update(`${scope}:${identifier}:${bucket}`).digest('hex');
  const [record] = await db.insert(rateLimits).values({ key, expiresAt: new Date((bucket + 1) * 3600000) })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`${rateLimits.count} + 1` } }).returning();
  await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date()));
  if (record.count > limit) throw new HttpError(429, 'Too many requests. Please try again in an hour.');
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return response({ error: error.message }, error.status);
  if (error && typeof error === 'object' && 'issues' in error) return response({ error: 'Please check the form fields and try again.' }, 400);
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return response({ error: 'That URL is already in use. Choose another slug.' }, 409);
  return response({ error: 'The service is temporarily unavailable. Please try again shortly.' }, 503);
}
