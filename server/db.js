import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { encryptText, decryptText } from './utils/cryptoUtils.js';
import { User } from './models/User.js';
import { Account } from './models/Account.js';
import { Post } from './models/Post.js';
import { Log } from './models/Log.js';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
  constructor() {
    this.fallbackData = {
      settings: {},
      accounts: [],
      posts: [],
      logs: []
    };
    this.loadFallbackData();
  }

  loadFallbackData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.fallbackData = {
          settings: parsed.settings || {},
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          posts: Array.isArray(parsed.posts) ? parsed.posts : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : []
        };
      }
    } catch (err) {
      console.error('[Fallback DB Load Error]:', err.message);
    }
  }

  saveFallbackData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.fallbackData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Fallback DB Save Error]:', err.message);
    }
  }

  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  // ================= SETTINGS ================= //

  async getSettings(userId) {
    if (this.isMongoConnected() && userId) {
      const user = await User.findById(userId);
      if (user) {
        return user.getDecryptedSettings();
      }
    }
    // Fallback JsonDB
    const rawSettings = this.fallbackData.settings || {};
    const settings = {};
    for (const [key, value] of Object.entries(rawSettings)) {
      if (['appSecret', 'openaiApiKey', 'grokApiKey', 'geminiApiKey'].includes(key)) {
        settings[key] = decryptText(value);
      } else {
        settings[key] = value;
      }
    }
    return settings;
  }

  async saveSettings(userId, newSettings = {}) {
    if (this.isMongoConnected() && userId) {
      const user = await User.findById(userId);
      if (user) {
        user.saveDecryptedSettings(newSettings);
        await user.save();
        return user.getDecryptedSettings();
      }
    }
    // Fallback JsonDB
    const currentRaw = this.fallbackData.settings || {};
    const updated = { ...currentRaw };
    for (const [k, v] of Object.entries(newSettings)) {
      if (v === undefined || v === null) continue;
      let storeVal = String(v);
      if (['appSecret', 'openaiApiKey', 'grokApiKey', 'geminiApiKey'].includes(k)) {
        storeVal = storeVal ? encryptText(storeVal) : '';
      }
      updated[k] = storeVal;
    }
    this.fallbackData.settings = updated;
    this.saveFallbackData();
    return this.getSettings();
  }

  // ================= ACCOUNTS ================= //

  async getAccounts(userId) {
    if (this.isMongoConnected() && userId) {
      const accounts = await Account.find({ userId }).sort({ createdAt: -1 });
      return accounts.map(acc => ({
        id: acc.id,
        platform: acc.platform || 'facebook',
        name: acc.name || '',
        accessToken: acc.getDecryptedToken(),
        avatar: acc.avatar || '',
        group: acc.group || 'Mặc định',
        tokenStatus: acc.tokenStatus || 'active',
        tokenError: acc.tokenError || null,
        lastCheckedAt: acc.lastCheckedAt ? acc.lastCheckedAt.toISOString() : new Date().toISOString(),
        createdAt: acc.createdAt ? acc.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: acc.updatedAt ? acc.updatedAt.toISOString() : new Date().toISOString()
      }));
    }
    // Fallback JsonDB
    return (this.fallbackData.accounts || []).map(acc => ({
      id: acc.id,
      platform: acc.platform || 'facebook',
      name: acc.name || '',
      accessToken: decryptText(acc.accessToken || ''),
      avatar: acc.avatar || '',
      group: acc.group || acc.accountGroup || 'Mặc định',
      tokenStatus: acc.tokenStatus || 'active',
      tokenError: acc.tokenError || null,
      lastCheckedAt: acc.lastCheckedAt || new Date().toISOString(),
      createdAt: acc.createdAt || new Date().toISOString(),
      updatedAt: acc.updatedAt || new Date().toISOString()
    }));
  }

  async saveAccount(userId, account) {
    if (this.isMongoConnected() && userId) {
      const now = new Date();
      const encryptedToken = account.accessToken ? encryptText(account.accessToken) : '';
      
      await Account.findOneAndUpdate(
        { userId, platform: account.platform || 'facebook', id: account.id },
        {
          userId,
          id: account.id,
          platform: account.platform || 'facebook',
          name: account.name || '',
          accessToken: encryptedToken,
          avatar: account.avatar || '',
          group: account.group || account.accountGroup || 'Mặc định',
          tokenStatus: account.tokenStatus || 'active',
          tokenError: account.tokenError || null,
          lastCheckedAt: now
        },
        { upsert: true, new: true }
      );
      return await this.getAccounts(userId);
    }
    // Fallback JsonDB
    const nowStr = new Date().toISOString();
    const existingIndex = this.fallbackData.accounts.findIndex(
      a => a.id === account.id && (a.platform || 'facebook') === (account.platform || 'facebook')
    );
    const accountToStore = {
      id: account.id,
      platform: account.platform || 'facebook',
      name: account.name || '',
      accessToken: encryptText(account.accessToken || ''),
      avatar: account.avatar || '',
      group: account.group || account.accountGroup || 'Mặc định',
      tokenStatus: account.tokenStatus || 'active',
      tokenError: account.tokenError || null,
      lastCheckedAt: account.lastCheckedAt || nowStr,
      createdAt: existingIndex >= 0 ? (this.fallbackData.accounts[existingIndex].createdAt || nowStr) : nowStr,
      updatedAt: nowStr
    };
    if (existingIndex >= 0) {
      this.fallbackData.accounts[existingIndex] = { ...this.fallbackData.accounts[existingIndex], ...accountToStore };
    } else {
      this.fallbackData.accounts.push(accountToStore);
    }
    this.saveFallbackData();
    return this.getAccounts();
  }

  async updateAccountGroup(userId, id, platform, group) {
    if (this.isMongoConnected() && userId) {
      await Account.findOneAndUpdate(
        { userId, platform: platform || 'facebook', id },
        { group: group || 'Mặc định' }
      );
      const accs = await this.getAccounts(userId);
      return accs.find(a => a.id === id && a.platform === platform);
    }
    // Fallback JsonDB
    const acc = this.fallbackData.accounts.find(a => a.id === id && (a.platform || 'facebook') === platform);
    if (acc) {
      acc.group = group || 'Mặc định';
      acc.updatedAt = new Date().toISOString();
      this.saveFallbackData();
    }
    const accs = await this.getAccounts();
    return accs.find(a => a.id === id && a.platform === platform);
  }

  async updateAccountStatus(userId, id, platform, tokenStatus, tokenError = null) {
    if (this.isMongoConnected() && userId) {
      await Account.findOneAndUpdate(
        { userId, platform: platform || 'facebook', id },
        { tokenStatus, tokenError, lastCheckedAt: new Date() }
      );
      const accs = await this.getAccounts(userId);
      return accs.find(a => a.id === id && a.platform === platform);
    }
    // Fallback JsonDB
    const nowStr = new Date().toISOString();
    const acc = this.fallbackData.accounts.find(a => a.id === id && (a.platform || 'facebook') === platform);
    if (acc) {
      acc.tokenStatus = tokenStatus;
      acc.tokenError = tokenError;
      acc.lastCheckedAt = nowStr;
      acc.updatedAt = nowStr;
      this.saveFallbackData();
    }
    const accs = await this.getAccounts();
    return accs.find(a => a.id === id && a.platform === platform);
  }

  async deleteAccount(userId, id, platform) {
    if (this.isMongoConnected() && userId) {
      await Account.deleteOne({ userId, platform: platform || 'facebook', id });
      return await this.getAccounts(userId);
    }
    // Fallback JsonDB
    this.fallbackData.accounts = this.fallbackData.accounts.filter(
      a => !(a.id === id && (a.platform || 'facebook') === platform)
    );
    this.saveFallbackData();
    return this.getAccounts();
  }

  // ================= POSTS ================= //

  async getPosts(userId) {
    if (this.isMongoConnected() && userId) {
      const posts = await Post.find({ userId }).sort({ createdAt: -1 });
      return posts.map(p => ({
        id: p._id.toString(),
        title: p.title || '',
        caption: p.caption || '',
        hashtags: p.hashtags || '',
        firstComment: p.firstComment || '',
        autoReplyMessage: p.autoReplyMessage || '',
        mediaUrl: p.mediaUrl || '',
        mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : (p.mediaUrl ? [p.mediaUrl] : []),
        mediaType: p.mediaType || 'image',
        postFormat: p.postFormat || 'standard',
        platforms: Array.isArray(p.platforms) ? p.platforms : ['facebook'],
        targetAccountIds: Array.isArray(p.targetAccountIds) ? p.targetAccountIds : [],
        accountVariations: p.accountVariations || {},
        status: p.status || 'draft',
        scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
        results: p.results || {},
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null
      }));
    }
    // Fallback JsonDB
    const posts = (this.fallbackData.posts || []).map(p => ({
      id: p.id,
      title: p.title || '',
      caption: p.caption || '',
      hashtags: p.hashtags || '',
      firstComment: p.firstComment || '',
      autoReplyMessage: p.autoReplyMessage || '',
      mediaUrl: p.mediaUrl || '',
      mediaUrls: Array.isArray(p.mediaUrls) ? p.mediaUrls : (p.mediaUrl ? [p.mediaUrl] : []),
      mediaType: p.mediaType || 'image',
      postFormat: p.postFormat || 'standard',
      platforms: Array.isArray(p.platforms) ? p.platforms : ['facebook'],
      targetAccountIds: Array.isArray(p.targetAccountIds) ? p.targetAccountIds : [],
      accountVariations: p.accountVariations || {},
      status: p.status || 'draft',
      scheduledAt: p.scheduledAt || null,
      results: p.results || {},
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
      publishedAt: p.publishedAt || null
    }));
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async createPost(userId, post) {
    if (this.isMongoConnected() && userId) {
      const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
      const mediaUrl = mediaUrls[0] || post.mediaUrl || '';
      const formattedHashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : String(post.hashtags || '');
      const rawFormat = String(post.postFormat || 'standard');
      const formattedPostFormat = (rawFormat === 'reel' || rawFormat === 'reels') ? 'reels' : rawFormat;
      
      const newPost = new Post({
        userId,
        title: post.title || '',
        caption: post.caption || '',
        hashtags: formattedHashtags,
        firstComment: post.firstComment || '',
        autoReplyMessage: post.autoReplyMessage || '',
        mediaUrl,
        mediaUrls,
        mediaType: post.mediaType || 'image',
        postFormat: formattedPostFormat,
        platforms: post.platforms || ['facebook'],
        targetAccountIds: post.targetAccountIds || [],
        accountVariations: post.accountVariations || {},
        status: post.scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
        results: {}
      });

      await newPost.save();
      const allPosts = await this.getPosts(userId);
      return allPosts.find(p => p.id === newPost._id.toString());
    }
    // Fallback JsonDB
    const newId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
    const mediaUrl = mediaUrls[0] || post.mediaUrl || '';
    const now = new Date().toISOString();
    const newPost = {
      id: newId,
      title: post.title || '',
      caption: post.caption || '',
      hashtags: post.hashtags || '',
      firstComment: post.firstComment || '',
      autoReplyMessage: post.autoReplyMessage || '',
      mediaUrl,
      mediaUrls,
      mediaType: post.mediaType || 'image',
      postFormat: post.postFormat || 'standard',
      platforms: post.platforms || ['facebook'],
      targetAccountIds: post.targetAccountIds || [],
      accountVariations: post.accountVariations || {},
      status: post.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: post.scheduledAt || null,
      results: {},
      createdAt: now,
      updatedAt: now,
      publishedAt: null
    };
    this.fallbackData.posts.unshift(newPost);
    this.saveFallbackData();
    return this.getPosts().then ? await this.getPosts() : this.getPosts();
  }

  async updatePost(userId, id, updates) {
    if (this.isMongoConnected() && userId && mongoose.Types.ObjectId.isValid(id)) {
      if (updates.mediaUrls && Array.isArray(updates.mediaUrls)) {
        updates.mediaUrl = updates.mediaUrls[0] || '';
      }
      if (updates.hashtags && Array.isArray(updates.hashtags)) {
        updates.hashtags = updates.hashtags.join(' ');
      }
      if (updates.postFormat === 'reel') {
        updates.postFormat = 'reels';
      }
      if (updates.scheduledAt) {
        updates.scheduledAt = new Date(updates.scheduledAt);
      }
      const updated = await Post.findOneAndUpdate(
        { userId, _id: id },
        { ...updates },
        { new: true }
      );
      if (!updated) return null;
      const allPosts = await this.getPosts(userId);
      return allPosts.find(p => p.id === id);
    }
    // Fallback JsonDB
    const index = this.fallbackData.posts.findIndex(p => p.id === id);
    if (index === -1) return null;
    const existing = this.fallbackData.posts[index];
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    if (updates.mediaUrls && Array.isArray(updates.mediaUrls)) {
      merged.mediaUrl = updates.mediaUrls[0] || '';
    }
    this.fallbackData.posts[index] = merged;
    this.saveFallbackData();
    return merged;
  }

  async deletePost(userId, id) {
    if (this.isMongoConnected() && userId && mongoose.Types.ObjectId.isValid(id)) {
      await Post.deleteOne({ userId, _id: id });
      return await this.getPosts(userId);
    }
    // Fallback JsonDB
    this.fallbackData.posts = this.fallbackData.posts.filter(p => p.id !== id);
    this.saveFallbackData();
    return this.getPosts();
  }

  // ================= BACKUP IMPORT / EXPORT ================= //

  async exportBackupData(userId) {
    const accounts = await this.getAccounts(userId);
    const settings = await this.getSettings(userId);
    const posts = await this.getPosts(userId);

    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'Facebook Multi-Publisher All-in-One',
      counts: {
        accounts: accounts.length,
        posts: posts.length
      },
      accounts,
      settings,
      posts
    };
  }

  async importBackupData(userId, backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Dữ liệu tệp sao lưu không hợp lệ.');
    }

    let restoredAccountsCount = 0;
    let restoredPostsCount = 0;

    if (Array.isArray(backupData.accounts)) {
      for (const acc of backupData.accounts) {
        if (acc && acc.id) {
          await this.saveAccount(userId, acc);
          restoredAccountsCount++;
        }
      }
    }

    if (Array.isArray(backupData.posts)) {
      for (const post of backupData.posts) {
        if (post) {
          await this.createPost(userId, post);
          restoredPostsCount++;
        }
      }
    }

    if (backupData.settings && typeof backupData.settings === 'object') {
      await this.saveSettings(userId, backupData.settings);
    }

    return {
      success: true,
      restoredAccountsCount,
      restoredPostsCount,
      message: `Đã khôi phục thành công ${restoredAccountsCount} Fanpage và ${restoredPostsCount} bài viết từ bản sao lưu!`
    };
  }
}

export const db = new DatabaseManager();
