import cron from 'node-cron';
import { db } from '../db.js';
import { executePostPublish } from './postPublisher.js';

export function initScheduler() {
  console.log('[Scheduler] Initialized Meta Multi-Post Cron Worker (runs every minute)');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const posts = db.getPosts();
      const now = new Date();

      const pendingScheduledPosts = posts.filter(p => {
        if (p.status !== 'scheduled' || !p.scheduledAt) return false;
        const scheduledTime = new Date(p.scheduledAt);
        return scheduledTime <= now;
      });

      if (pendingScheduledPosts.length > 0) {
        console.log(`[Scheduler] Found ${pendingScheduledPosts.length} post(s) ready to publish!`);
      }

      for (const post of pendingScheduledPosts) {
        console.log(`[Scheduler] Auto-publishing post ID: ${post.id}`);
        try {
          await executePostPublish(post.id);
        } catch (err) {
          console.error(`[Scheduler] Failed auto-publishing post ${post.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error running cron check:', err);
    }
  });
}
