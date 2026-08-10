import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial default schema
const defaultData = {
  settings: {
    appId: '',
    appSecret: '',
    updatedAt: new Date().toISOString()
  },
  accounts: [],
  posts: [],
  logs: []
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
}

class LocalDB {
  constructor() {
    this.filePath = DB_FILE;
    this.read();
  }

  read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch (err) {
      console.error('Error reading DB, resetting to default:', err);
      this.data = { ...defaultData };
      this.write();
    }
  }

  write() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to DB:', err);
    }
  }

  getSettings() {
    this.read();
    const settings = this.data.settings || defaultData.settings;
    if (!settings.securityPin) {
      settings.securityPin = '123456'; // Default security PIN
    }
    return settings;
  }

  saveSettings(settings) {
    this.read();
    this.data.settings = { ...this.data.settings, ...settings, updatedAt: new Date().toISOString() };
    this.write();
    return this.data.settings;
  }

  verifyPin(pin) {
    this.read();
    const currentPin = this.getSettings().securityPin || '123456';
    return String(pin).trim() === String(currentPin).trim();
  }

  updatePin(newPin) {
    this.read();
    if (!newPin || String(newPin).trim().length < 4) {
      throw new Error('Mã PIN bảo mật phải có ít nhất 4 ký tự.');
    }
    this.data.settings.securityPin = String(newPin).trim();
    this.write();
    return true;
  }

  getAccounts() {
    this.read();
    return this.data.accounts || [];
  }

  saveAccount(account) {
    this.read();
    const existingIdx = this.data.accounts.findIndex(a => a.id === account.id && a.platform === account.platform);
    if (existingIdx >= 0) {
      this.data.accounts[existingIdx] = { 
        group: 'Mặc định',
        ...this.data.accounts[existingIdx], 
        ...account, 
        updatedAt: new Date().toISOString() 
      };
    } else {
      this.data.accounts.push({ 
        group: 'Mặc định',
        ...account, 
        createdAt: new Date().toISOString() 
      });
    }
    this.write();
    return this.data.accounts;
  }

  updateAccountGroup(id, platform, group) {
    this.read();
    const acc = (this.data.accounts || []).find(a => a.id === id && a.platform === platform);
    if (acc) {
      acc.group = group || 'Mặc định';
      acc.updatedAt = new Date().toISOString();
      this.write();
    }
    return acc;
  }

  deleteAccount(id, platform) {
    this.read();
    this.data.accounts = this.data.accounts.filter(a => !(a.id === id && a.platform === platform));
    this.write();
    return this.data.accounts;
  }

  getPosts() {
    this.read();
    return (this.data.posts || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createPost(post) {
    this.read();
    const newPost = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: post.title || '',
      caption: post.caption || '',
      hashtags: post.hashtags || '',
      firstComment: post.firstComment || '',
      mediaUrl: post.mediaUrl || '',
      mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []),
      mediaType: post.mediaType || 'image', // 'image' | 'video'
      postFormat: post.postFormat || 'standard', // 'standard' | 'reel'
      platforms: post.platforms || ['facebook'],
      targetAccountIds: post.targetAccountIds || [],
      status: post.scheduledAt ? 'scheduled' : 'draft', // 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
      scheduledAt: post.scheduledAt || null,
      results: {}, // platform -> { status, postUrl, error }
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.posts.push(newPost);
    this.write();
    return newPost;
  }

  updatePost(id, updates) {
    this.read();
    const post = this.data.posts.find(p => p.id === id);
    if (post) {
      if (updates.mediaUrls && Array.isArray(updates.mediaUrls)) {
        updates.mediaUrl = updates.mediaUrls[0] || '';
      }
      Object.assign(post, updates, { updatedAt: new Date().toISOString() });
      this.write();
    }
    return post;
  }

  updateAccountStatus(id, platform, tokenStatus, tokenError = null) {
    this.read();
    const acc = (this.data.accounts || []).find(a => a.id === id && a.platform === platform);
    if (acc) {
      acc.tokenStatus = tokenStatus; // 'active' | 'invalid' | 'expired'
      acc.tokenError = tokenError;
      acc.lastCheckedAt = new Date().toISOString();
      this.write();
    }
    return acc;
  }

  deletePost(id) {
    this.read();
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    this.write();
    return this.data.posts;
  }
}

export const db = new LocalDB();
