import { z } from 'zod';
import { categories } from './types';

const image = z.string().max(1500).refine((value) => {
  if (/^\/media\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes('..')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Use an HTTPS image URL or a /media/ image.');

export const postInput = z.object({
  title: z.string().trim().min(5).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  excerpt: z.string().trim().min(20).max(500),
  content: z.string().trim().min(50).max(100000),
  category: z.enum(categories),
  author: z.string().trim().min(2).max(100),
  cover: image,
  status: z.enum(['draft', 'published']),
  featured: z.boolean(),
  sample: z.boolean(),
});

export const commentInput = z.object({ postId: z.string().min(1).max(100), body: z.string().trim().min(3).max(2000) });
export const subscriptionInput = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), consent: z.literal(true), website: z.string().max(0).optional() });
export const contactInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(20).max(5000),
  website: z.string().max(0).optional(),
});
