import fs from 'fs';
import path from 'path';
import { encryptText, decryptText } from './utils/cryptoUtils.js';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonDB {
  constructor() {
    this.data = {
      settings: {},
      accounts: [],
      posts: [],
      logs: []
    };
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          settings: parsed.settings || {},
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          posts: Array.isArray(parsed.posts) ? parsed.posts : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : []
        };
      } else {
        this.saveData();
      }
    } catch (err) {
      console.error('[Database Load Error]:', err.message);
      this.saveData();
    }
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Database Save Error]:', err.message);
    }
  }

  // ================= SETTINGS ================= //

  getSettings() {
    const rawSettings = this.data.settings || {};
    const settings = {};
    for (const [key, value] of Object.entries(rawSettings)) {
      if (['appSecret', 'openaiApiKey', 'grokApiKey'].includes(key)) {
        settings[key] = decryptText(value);
      } else {
        settings[key] = value;
      }
    }
    settings.isPinConfigured = Boolean(settings.securityPin && String(settings.securityPin).trim().length >= 4);
    return settings;
  }

  saveSettings(newSettings = {}) {
    const currentRaw = this.data.settings || {};
    const updated = { ...currentRaw };

    for (const [k, v] of Object.entries(newSettings)) {
      if (k === 'isPinConfigured') continue;
      let storeVal = String(v ?? '');
      if (['appSecret', 'openaiApiKey', 'grokApiKey'].includes(k)) {
        storeVal = encryptText(storeVal);
      }
      updated[k] = storeVal;
    }

    this.data.settings = updated;
    this.saveData();
    return this.getSettings();
  }

  isPinConfigured() {
    const settings = this.getSettings();
    return settings.isPinConfigured;
  }

  verifyPin(pin) {
    const settings = this.getSettings();
    if (!settings.isPinConfigured) {
      return false; // Force setting up PIN first
    }
    return String(pin).trim() === String(settings.securityPin).trim();
  }

  updatePin(newPin) {
    if (!newPin || String(newPin).trim().length < 4) {
      throw new Error('Mã PIN bảo mật phải có ít nhất 4 ký tự.');
    }
    this.saveSettings({ securityPin: String(newPin).trim() });
    return true;
  }

  // ================= ACCOUNTS ================= //

  getAccounts() {
    return (this.data.accounts || []).map(acc => ({
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

  saveAccount(account) {
    const now = new Date().toISOString();
    const existingIndex = this.data.accounts.findIndex(
      a => a.id === account.id && (a.platform || 'facebook') === (account.platform || 'facebook')
    );

    const accountToStore = {
      id: account.id,
      platform: account.platform || 'facebook',
      name: account.name || '',
      accessToken: encryptText(account.accessToken || ''),
      avatar: account.avatar || '',
      accountGroup: account.group || account.accountGroup || 'Mặc định',
      group: account.group || account.accountGroup || 'Mặc định',
      tokenStatus: account.tokenStatus || 'active',
      tokenError: account.tokenError || null,
      lastCheckedAt: account.lastCheckedAt || now,
      createdAt: existingIndex >= 0 ? (this.data.accounts[existingIndex].createdAt || now) : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      this.data.accounts[existingIndex] = {
        ...this.data.accounts[existingIndex],
        ...accountToStore
      };
    } else {
      this.data.accounts.push(accountToStore);
    }

    this.saveData();
    return this.getAccounts();
  }

  updateAccountGroup(id, platform, group) {
    const acc = this.data.accounts.find(a => a.id === id && (a.platform || 'facebook') === platform);
    if (acc) {
      acc.group = group || 'Mặc định';
      acc.accountGroup = group || 'Mặc định';
      acc.updatedAt = new Date().toISOString();
      this.saveData();
    }
    return this.getAccounts().find(a => a.id === id && a.platform === platform);
  }

  updateAccountStatus(id, platform, tokenStatus, tokenError = null) {
    const now = new Date().toISOString();
    const acc = this.data.accounts.find(a => a.id === id && (a.platform || 'facebook') === platform);
    if (acc) {
      acc.tokenStatus = tokenStatus;
      acc.tokenError = tokenError;
      acc.lastCheckedAt = now;
      acc.updatedAt = now;
      this.saveData();
    }
    return this.getAccounts().find(a => a.id === id && a.platform === platform);
  }

  deleteAccount(id, platform) {
    this.data.accounts = this.data.accounts.filter(
      a => !(a.id === id && (a.platform || 'facebook') === platform)
    );
    this.saveData();
    return this.getAccounts();
  }

  // ================= POSTS ================= //

  getPosts() {
    const posts = (this.data.posts || []).map(p => ({
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
      status: p.status || 'draft',
      scheduledAt: p.scheduledAt || null,
      results: p.results || {},
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
      publishedAt: p.publishedAt || null
    }));

    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createPost(post) {
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
      status: post.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: post.scheduledAt || null,
      results: {},
      createdAt: now,
      updatedAt: now,
      publishedAt: null
    };

    this.data.posts.unshift(newPost);
    this.saveData();
    return this.getPosts().find(p => p.id === newId);
  }

  updatePost(id, updates) {
    const index = this.data.posts.findIndex(p => p.id === id);
    if (index === -1) return null;

    const existing = this.data.posts[index];
    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.mediaUrls && Array.isArray(updates.mediaUrls)) {
      merged.mediaUrl = updates.mediaUrls[0] || '';
    }

    this.data.posts[index] = merged;
    this.saveData();
    return merged;
  }

  deletePost(id) {
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    this.saveData();
    return this.getPosts();
  }

  // ================= LOGS ================= //

  log(level, message, details = '') {
    const logEntry = {
      id: Date.now(),
      level,
      message,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      createdAt: new Date().toISOString()
    };
    this.data.logs.unshift(logEntry);
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.saveData();
  }

  getLogs(limit = 100) {
    return (this.data.logs || []).slice(0, limit);
  }
}

export const db = new JsonDB();
