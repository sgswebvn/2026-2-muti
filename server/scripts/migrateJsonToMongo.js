import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { Account } from '../models/Account.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export async function migrateJsonDataForUser(userId) {
  if (!fs.existsSync(DB_FILE)) {
    console.log('[Migration] No local db.json file found to migrate.');
    return { success: true, migratedAccounts: 0, migratedPosts: 0 };
  }

  try {
    console.log(`🚀 [Migration] Migrating local db.json data to MongoDB for user ${userId}...`);

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found for migration');

    // 1. Migrate Settings
    const localSettings = db.getSettings();
    if (localSettings && Object.keys(localSettings).length > 0) {
      user.saveDecryptedSettings(localSettings);
      await user.save();
      console.log('  └─ Migrated API Settings & App Secret.');
    }

    // 2. Migrate Accounts
    const localAccounts = db.getAccounts();
    let migratedAccounts = 0;
    for (const acc of localAccounts) {
      try {
        await Account.findOneAndUpdate(
          { userId, platform: acc.platform || 'facebook', id: acc.id },
          {
            userId,
            id: acc.id,
            platform: acc.platform || 'facebook',
            name: acc.name || 'Fanpage',
            accessToken: acc.accessToken, // set raw, let's encrypt in setEncryptedToken or pass encrypted
            avatar: acc.avatar || '',
            group: acc.group || 'Mặc định',
            tokenStatus: acc.tokenStatus || 'active',
            tokenError: acc.tokenError || null,
            lastCheckedAt: acc.lastCheckedAt || new Date()
          },
          { upsert: true, new: true }
        );
        migratedAccounts++;
      } catch (accErr) {
        console.warn(`  └─ Skipping account ${acc.id}:`, accErr.message);
      }
    }
    console.log(`  └─ Migrated ${migratedAccounts} accounts.`);

    // 3. Migrate Posts
    const localPosts = db.getPosts();
    let migratedPosts = 0;
    for (const post of localPosts) {
      try {
        await Post.findOneAndUpdate(
          { userId, _id: post._id || post.id },
          {
            userId,
            title: post.title || '',
            caption: post.caption || '',
            hashtags: post.hashtags || '',
            firstComment: post.firstComment || '',
            autoReplyMessage: post.autoReplyMessage || '',
            mediaUrl: post.mediaUrl || '',
            mediaUrls: post.mediaUrls || [],
            mediaType: post.mediaType || 'image',
            postFormat: post.postFormat || 'standard',
            platforms: post.platforms || ['facebook'],
            targetAccountIds: post.targetAccountIds || [],
            accountVariations: post.accountVariations || {},
            status: post.status || 'draft',
            scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
            results: post.results || {}
          },
          { upsert: true, new: true }
        );
        migratedPosts++;
      } catch (postErr) {
        console.warn(`  └─ Skipping post ${post.id}:`, postErr.message);
      }
    }
    console.log(`  └─ Migrated ${migratedPosts} posts.`);

    return { success: true, migratedAccounts, migratedPosts };

  } catch (error) {
    console.error('[Migration Error]:', error.message);
    return { success: false, error: error.message };
  }
}
