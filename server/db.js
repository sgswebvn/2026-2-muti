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
    return this.data.settings || defaultData.settings;
  }

  saveSettings(settings) {
    this.read();
    this.data.settings = { ...this.data.settings, ...settings, updatedAt: new Date().toISOString() };
    this.write();
    return this.data.settings;
  }

  getAccounts() {
    this.read();
    return this.data.accounts || [];
  }

  saveAccount(account) {
    this.read();
    const existingIdx = this.data.accounts.findIndex(a => a.id === account.id && a.platform === account.platform);
    if (existingIdx >= 0) {
      this.data.accounts[existingIdx] = { ...this.data.accounts[existingIdx], ...account, updatedAt: new Date().toISOString() };
    } else {
      this.data.accounts.push({ ...account, createdAt: new Date().toISOString() });
    }
    this.write();
    return this.data.accounts;
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
      mediaUrl: post.mediaUrl || '',
      mediaType: post.mediaType || 'image', // 'image' | 'video'
      platforms: post.platforms || ['facebook', 'instagram', 'threads'],
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
      Object.assign(post, updates, { updatedAt: new Date().toISOString() });
      this.write();
    }
    return post;
  }

  deletePost(id) {
    this.read();
    this.data.posts = this.data.posts.filter(p => p.id !== id);
    this.write();
    return this.data.posts;
  }
}

export const db = new LocalDB();
