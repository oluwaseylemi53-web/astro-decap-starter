import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { posts } from '../../db/schema';

export const GET: APIRoute = async ({ site }) => {
  try {
    const articles = await db.select({ slug: posts.slug, updatedAt: posts.updatedAt }).from(posts).where(eq(posts.status, 'published'));
    const base = site?.href || 'https://cozy-gnome-o2.netlify.app/';
    const pages = ['', 'blog', 'about', 'contact', 'privacy'].map((path) => `<url><loc>${base}${path}</loc></url>`);
    const entries = articles.map((post) => `<url><loc>${base}blog/${post.slug}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages, ...entries].join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch { return new Response('Sitemap temporarily unavailable.', { status: 503, headers: { 'Retry-After': '60' } }); }
};
