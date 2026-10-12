import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { posts } from '../../db/schema';
import { postSummary } from '../../db/queries.js';

export const GET: APIRoute = async ({ site }) => {
  try {
    const data = await db.select(postSummary).from(posts).where(eq(posts.status, 'published')).orderBy(desc(posts.publishedAt)).limit(100);
    const escape = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
    const base = site?.href || 'https://cozy-gnome-o2.netlify.app/';
    const items = data.map((post) => `<item><title>${escape(post.title)}</title><link>${base}blog/${post.slug}</link><guid isPermaLink="true">${base}blog/${post.slug}</guid><description>${escape(post.excerpt)}</description><category>${escape(post.category)}</category><pubDate>${post.publishedAt.toUTCString()}</pubDate></item>`).join('');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>O2 Media Blog</title><link>${base}</link><description>A fresh perspective on digital media and marketing.</description><language>en</language>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch { return new Response('The feed is temporarily unavailable.', { status: 503, headers: { 'Retry-After': '60' } }); }
};
