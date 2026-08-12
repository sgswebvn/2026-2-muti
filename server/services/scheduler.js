import cron from 'node-cron';
import mongoose from 'mongoose';
import { db } from '../db.js';
import { Post } from '../models/Post.js';
import { Account } from '../models/Account.js';
import { executePostPublish } from './postPublisher.js';
import { autoReplyCustomerComments } from './facebookService.js';
import { cleanUploadsFolder } from './cleanupService.js';

export function initScheduler() {
  console.log('[Scheduler] Initialized Meta Multi-Post Cron Worker & Auto-Reply Bot (runs every minute)');

  // Run every minute for scheduled posts & auto replies
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      if (mongoose.connection.readyState === 1) {
        // 1. Process scheduled posts in MongoDB Cloud
        const pendingScheduledPosts = await Post.find({
          status: 'scheduled',
          scheduledAt: { $lte: now }
        });

        for (const post of pendingScheduledPosts) {
          console.log(`[Scheduler] 🚀 Auto-publishing scheduled post ID: ${post._id} (User: ${post.userId})`);
          
          // Lock status immediately to prevent duplicate execution across cron runs
          post.status = 'publishing';
          await post.save();

          try {
            await executePostPublish(post._id.toString(), post.userId.toString());
          } catch (err) {
            console.error(`[Scheduler Error] Failed publishing scheduled post ${post._id}:`, err.message);
            post.status = 'failed';
            post.results = { error: err.message };
            await post.save();
          }
        }

        // 2. Process Auto Reply to Customer Comments for Published Posts
        const publishedPostsWithAutoReply = await Post.find({
          status: 'published',
          autoReplyMessage: { $exists: true, $ne: '' }
        });

        for (const post of publishedPostsWithAutoReply) {
          const userAccounts = await Account.find({ userId: post.userId });

          for (const accId of post.targetAccountIds || []) {
            const acc = userAccounts.find(a => a.id === accId);
            const res = post.results ? (post.results[`facebook_${accId}`] || post.results[accId]) : null;

            if (acc && res && res.postId) {
              const formattedAcc = {
                id: acc.id,
                name: acc.name,
                accessToken: acc.getDecryptedToken()
              };
              await autoReplyCustomerComments(formattedAcc, res.postId, post.autoReplyMessage);
            }
          }
        }
      } else {
        // Fallback JsonDB mode
        const posts = await db.getPosts();
        const accounts = await db.getAccounts();

        const pendingScheduledPosts = posts.filter(p => {
          if (p.status !== 'scheduled' || !p.scheduledAt) return false;
          const scheduledTime = new Date(p.scheduledAt);
          return scheduledTime <= now;
        });

        for (const post of pendingScheduledPosts) {
          console.log(`[Scheduler Fallback] 🚀 Auto-publishing post ID: ${post.id}`);
          await db.updatePost(post.userId, post.id, { status: 'publishing' });
          try {
            await executePostPublish(post.id, post.userId);
          } catch (err) {
            console.error(`[Scheduler Fallback Error] Failed auto-publishing post ${post.id}:`, err);
            await db.updatePost(post.userId, post.id, { status: 'failed', results: { error: err.message } });
          }
        }

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
      }

    } catch (err) {
      console.error('[Scheduler Error] Error running cron check:', err.message);
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
