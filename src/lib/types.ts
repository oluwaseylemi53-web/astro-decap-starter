export const categories = ['Strategy', 'Social Media', 'Content Creation', 'Branding', 'Industry Insights'] as const;

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  cover: string;
  status: string;
  featured: boolean;
  sample: boolean;
  readMinutes: number;
  publishedAt: string | Date;
  updatedAt?: string | Date;
};

export const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
