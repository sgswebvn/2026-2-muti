import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { encryptText, decryptText } from './utils/cryptoUtils.js';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'app.db');
const JSON_DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class SQLiteDB {
  constructor() {
    this.db = new Database(DB_FILE);
    // Enable PRAGMA for WAL mode for high performance
    this.db.pragma('journal_mode = WAL');
    this.initTables();
    this.migrateFromJsonIfPresent();
  }

  initTables() {
    // Settings table (Key-Value)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      );
    `);

    // Accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT NOT NULL,
        platform TEXT NOT NULL,
        name TEXT,
        accessToken TEXT,
        avatar TEXT,
        accountGroup TEXT DEFAULT 'Mặc định',
        tokenStatus TEXT DEFAULT 'active',
        tokenError TEXT,
        lastCheckedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        PRIMARY KEY (id, platform)
      );
    `);

    // Posts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        caption TEXT,
        hashtags TEXT,
        firstComment TEXT,
        autoReplyMessage TEXT,
        mediaUrl TEXT,
        mediaUrls TEXT,
        mediaType TEXT DEFAULT 'image',
        postFormat TEXT DEFAULT 'standard',
        platforms TEXT,
        targetAccountIds TEXT,
        status TEXT DEFAULT 'draft',
        scheduledAt TEXT,
        results TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        publishedAt TEXT
      );
    `);

    // Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        message TEXT,
        details TEXT,
        createdAt TEXT
      );
    `);
  }

  migrateFromJsonIfPresent() {
    if (!fs.existsSync(JSON_DB_FILE)) return;

    try {
      console.log('[SQLite Migration] Converting db.json to SQLite database app.db...');
      const raw = fs.readFileSync(JSON_DB_FILE, 'utf-8');
      const json = JSON.parse(raw);

      const transaction = this.db.transaction(() => {
        // Migrate settings
        if (json.settings) {
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
          `);
          const now = new Date().toISOString();
          for (const [key, val] of Object.entries(json.settings)) {
            let storeVal = String(val || '');
            if (['appSecret', 'openaiApiKey', 'grokApiKey'].includes(key)) {
              storeVal = encryptText(storeVal);
            }
            stmt.run(key, storeVal, now);
          }
        }

        // Migrate accounts
        if (Array.isArray(json.accounts)) {
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO accounts (
              id, platform, name, accessToken, avatar, accountGroup, tokenStatus, tokenError, lastCheckedAt, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const acc of json.accounts) {
            stmt.run(
              acc.id,
              acc.platform || 'facebook',
              acc.name || '',
              encryptText(acc.accessToken || ''),
              acc.avatar || '',
              acc.group || acc.accountGroup || 'Mặc định',
              acc.tokenStatus || 'active',
              acc.tokenError || null,
              acc.lastCheckedAt || new Date().toISOString(),
              acc.createdAt || new Date().toISOString(),
              acc.updatedAt || new Date().toISOString()
            );
          }
        }

        // Migrate posts
        if (Array.isArray(json.posts)) {
          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO posts (
              id, title, caption, hashtags, firstComment, autoReplyMessage, mediaUrl, mediaUrls,
              mediaType, postFormat, platforms, targetAccountIds, status, scheduledAt, results,
              createdAt, updatedAt, publishedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const p of json.posts) {
            stmt.run(
              p.id,
              p.title || '',
              p.caption || '',
              p.hashtags || '',
              p.firstComment || '',
              p.autoReplyMessage || '',
              p.mediaUrl || '',
              JSON.stringify(p.mediaUrls || (p.mediaUrl ? [p.mediaUrl] : [])),
              p.mediaType || 'image',
              p.postFormat || 'standard',
              JSON.stringify(p.platforms || ['facebook']),
              JSON.stringify(p.targetAccountIds || []),
              p.status || 'draft',
              p.scheduledAt || null,
              JSON.stringify(p.results || {}),
              p.createdAt || new Date().toISOString(),
              p.updatedAt || new Date().toISOString(),
              p.publishedAt || null
            );
          }
        }
      });

      transaction();
      fs.renameSync(JSON_DB_FILE, `${JSON_DB_FILE}.bak`);
      console.log('[SQLite Migration] Migration completed successfully. Backup created: db.json.bak');
    } catch (err) {
      console.error('[SQLite Migration Error]:', err);
    }
  }

  // ================= SETTINGS ================= //

  getSettings() {
    const rows = this.db.prepare(`SELECT key, value FROM settings`).all();
    const settings = {};
    for (const r of rows) {
      if (['appSecret', 'openaiApiKey', 'grokApiKey'].includes(r.key)) {
        settings[r.key] = decryptText(r.value);
      } else {
        settings[r.key] = r.value;
      }
    }
    // Remove hardcoded '123456' default PIN!
    settings.isPinConfigured = Boolean(settings.securityPin && settings.securityPin.trim().length >= 4);
    return settings;
  }

  saveSettings(newSettings = {}) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)
    `);
    const now = new Date().toISOString();
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };

    const transaction = this.db.transaction(() => {
      for (const [k, v] of Object.entries(updated)) {
        if (k === 'isPinConfigured') continue;
        let storeVal = String(v ?? '');
        if (['appSecret', 'openaiApiKey', 'grokApiKey'].includes(k)) {
          storeVal = encryptText(storeVal);
        }
        stmt.run(k, storeVal, now);
      }
    });

    transaction();
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
    const rows = this.db.prepare(`SELECT * FROM accounts`).all();
    return rows.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      name: acc.name,
      accessToken: decryptText(acc.accessToken),
      avatar: acc.avatar,
      group: acc.accountGroup || 'Mặc định',
      tokenStatus: acc.tokenStatus,
      tokenError: acc.tokenError,
      lastCheckedAt: acc.lastCheckedAt,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt
    }));
  }

  saveAccount(account) {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (
        id, platform, name, accessToken, avatar, accountGroup, tokenStatus, tokenError, lastCheckedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, platform) DO UPDATE SET
        name = excluded.name,
        accessToken = excluded.accessToken,
        avatar = excluded.avatar,
        accountGroup = COALESCE(accounts.accountGroup, excluded.accountGroup),
        tokenStatus = excluded.tokenStatus,
        tokenError = excluded.tokenError,
        lastCheckedAt = excluded.lastCheckedAt,
        updatedAt = excluded.updatedAt
    `);

    const now = new Date().toISOString();
    stmt.run(
      account.id,
      account.platform || 'facebook',
      account.name || '',
      encryptText(account.accessToken || ''),
      account.avatar || '',
      account.group || 'Mặc định',
      account.tokenStatus || 'active',
      account.tokenError || null,
      account.lastCheckedAt || now,
      now,
      now
    );

    return this.getAccounts();
  }

  updateAccountGroup(id, platform, group) {
    const stmt = this.db.prepare(`
      UPDATE accounts SET accountGroup = ?, updatedAt = ? WHERE id = ? AND platform = ?
    `);
    stmt.run(group || 'Mặc định', new Date().toISOString(), id, platform);
    return this.getAccounts().find(a => a.id === id && a.platform === platform);
  }

  updateAccountStatus(id, platform, tokenStatus, tokenError = null) {
    const stmt = this.db.prepare(`
      UPDATE accounts SET tokenStatus = ?, tokenError = ?, lastCheckedAt = ?, updatedAt = ? WHERE id = ? AND platform = ?
    `);
    const now = new Date().toISOString();
    stmt.run(tokenStatus, tokenError, now, now, id, platform);
    return this.getAccounts().find(a => a.id === id && a.platform === platform);
  }

  deleteAccount(id, platform) {
    const stmt = this.db.prepare(`DELETE FROM accounts WHERE id = ? AND platform = ?`);
    stmt.run(id, platform);
    return this.getAccounts();
  }

  // ================= POSTS ================= //

  getPosts() {
    const rows = this.db.prepare(`SELECT * FROM posts ORDER BY createdAt DESC`).all();
    return rows.map(p => ({
      id: p.id,
      title: p.title || '',
      caption: p.caption || '',
      hashtags: p.hashtags || '',
      firstComment: p.firstComment || '',
      autoReplyMessage: p.autoReplyMessage || '',
      mediaUrl: p.mediaUrl || '',
      mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : (p.mediaUrl ? [p.mediaUrl] : []),
      mediaType: p.mediaType || 'image',
      postFormat: p.postFormat || 'standard',
      platforms: p.platforms ? JSON.parse(p.platforms) : ['facebook'],
      targetAccountIds: p.targetAccountIds ? JSON.parse(p.targetAccountIds) : [],
      status: p.status || 'draft',
      scheduledAt: p.scheduledAt || null,
      results: p.results ? JSON.parse(p.results) : {},
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      publishedAt: p.publishedAt || null
    }));
  }

  createPost(post) {
    const newId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
    const mediaUrl = mediaUrls[0] || post.mediaUrl || '';
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, title, caption, hashtags, firstComment, autoReplyMessage, mediaUrl, mediaUrls,
        mediaType, postFormat, platforms, targetAccountIds, status, scheduledAt, results,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newId,
      post.title || '',
      post.caption || '',
      post.hashtags || '',
      post.firstComment || '',
      post.autoReplyMessage || '',
      mediaUrl,
      JSON.stringify(mediaUrls),
      post.mediaType || 'image',
      post.postFormat || 'standard',
      JSON.stringify(post.platforms || ['facebook']),
      JSON.stringify(post.targetAccountIds || []),
      post.scheduledAt ? 'scheduled' : 'draft',
      post.scheduledAt || null,
      JSON.stringify({}),
      now,
      now
    );

    return this.getPosts().find(p => p.id === newId);
  }

  updatePost(id, updates) {
    const existing = this.getPosts().find(p => p.id === id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    if (updates.mediaUrls && Array.isArray(updates.mediaUrls)) {
      merged.mediaUrl = updates.mediaUrls[0] || '';
    }

    const stmt = this.db.prepare(`
      UPDATE posts SET
        title = ?, caption = ?, hashtags = ?, firstComment = ?, autoReplyMessage = ?,
        mediaUrl = ?, mediaUrls = ?, mediaType = ?, postFormat = ?, platforms = ?,
        targetAccountIds = ?, status = ?, scheduledAt = ?, results = ?, updatedAt = ?, publishedAt = ?
      WHERE id = ?
    `);

    stmt.run(
      merged.title || '',
      merged.caption || '',
      merged.hashtags || '',
      merged.firstComment || '',
      merged.autoReplyMessage || '',
      merged.mediaUrl || '',
      JSON.stringify(merged.mediaUrls || []),
      merged.mediaType || 'image',
      merged.postFormat || 'standard',
      JSON.stringify(merged.platforms || ['facebook']),
      JSON.stringify(merged.targetAccountIds || []),
      merged.status || 'draft',
      merged.scheduledAt || null,
      JSON.stringify(merged.results || {}),
      merged.updatedAt,
      merged.publishedAt || null,
      id
    );

    return merged;
  }

  deletePost(id) {
    const stmt = this.db.prepare(`DELETE FROM posts WHERE id = ?`);
    stmt.run(id);
    return this.getPosts();
  }

  // ================= LOGS ================= //

  log(level, message, details = '') {
    const stmt = this.db.prepare(`
      INSERT INTO logs (level, message, details, createdAt) VALUES (?, ?, ?, ?)
    `);
    stmt.run(level, message, typeof details === 'object' ? JSON.stringify(details) : String(details), new Date().toISOString());
  }

  getLogs(limit = 100) {
    return this.db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ?`).all(limit);
  }
}

export const db = new SQLiteDB();
