import cron from 'node-cron';
import { db } from '../db.js';
import { executePostPublish } from './postPublisher.js';
import { autoReplyCustomerComments } from './facebookService.js';

export function initScheduler() {
  console.log('[Scheduler] Initialized Meta Multi-Post Cron Worker & Auto-Reply Bot (runs every minute)');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const posts = db.getPosts();
      const accounts = db.getAccounts();
      const now = new Date();

      // 1. Process scheduled posts
      const pendingScheduledPosts = posts.filter(p => {
        if (p.status !== 'scheduled' || !p.scheduledAt) return false;
        const scheduledTime = new Date(p.scheduledAt);
        return scheduledTime <= now;
      });

      for (const post of pendingScheduledPosts) {
        console.log(`[Scheduler] Auto-publishing post ID: ${post.id}`);
        try {
          await executePostPublish(post.id);
        } catch (err) {
          console.error(`[Scheduler] Failed auto-publishing post ${post.id}:`, err);
        }
      }

      // 2. Process Auto Reply to Customer Comments on Published Posts
      const publishedPostsWithAutoReply = posts.filter(p => p.status === 'published' && p.autoReplyMessage);

      for (const post of publishedPostsWithAutoReply) {
        for (const accId of post.targetAccountIds || []) {
          const acc = accounts.find(a => a.id === accId);
          const res = post.results ? (post.results[`facebook_${accId}`] || post.results[accId]) : null;
          if (acc && res && res.postId) {
            await autoReplyCustomerComments(acc, res.postId, post.autoReplyMessage);
          }
        }
      }

    } catch (err) {
      console.error('[Scheduler] Error running cron check:', err);
    }
  });
}
