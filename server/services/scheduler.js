import cron from 'node-cron';
import { db } from '../db.js';
import { executePostPublish } from './postPublisher.js';
import { autoReplyCustomerComments } from './facebookService.js';
import { cleanUploadsFolder } from './cleanupService.js';

export function initScheduler() {
  console.log('[Scheduler] Initialized Meta Multi-Post Cron Worker & Auto-Reply Bot (runs every minute)');

  // Run every minute for scheduled posts & auto replies
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

  // Schedule daily cleanup of old upload files at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('[Scheduler] Running daily uploads cleanup...');
    cleanUploadsFolder(7);
  });

  // Run initial cleanup once on server start
  setTimeout(() => {
    cleanUploadsFolder(7);
  }, 5000);
}
