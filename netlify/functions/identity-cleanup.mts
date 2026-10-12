import type { UserDeletedEvent } from '@netlify/functions';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bookmarks, comments } from '../../db/schema.js';

export default {
  async userDeleted(event: UserDeletedEvent) {
    await db.delete(bookmarks).where(eq(bookmarks.userId, event.user.id));
    await db.delete(comments).where(eq(comments.userId, event.user.id));
  },
};
