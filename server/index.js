import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db.js';
import { exchangeForLongLivedToken, getFacebookPages } from './services/accountService.js';
import { executePostPublish } from './services/postPublisher.js';
import { initScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Ensure uploads folder exists & static serve
const UPLOADS_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve built frontend static files from 'dist' if present
const DIST_DIR = path.resolve('dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

// Configure Multer for local media storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max file limit
});

// Initialize Scheduler Worker
initScheduler();

// ==================== SECURITY & AUTH API ==================== //

// Verify PIN
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin } = req.body;
  const isValid = db.verifyPin(pin);
  if (isValid) {
    res.json({ success: true, message: 'Xác thực mã PIN thành công!' });
  } else {
    res.status(401).json({ success: false, error: 'Mã PIN bảo mật không chính xác!' });
  }
});

// Change PIN
app.post('/api/auth/change-pin', (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!db.verifyPin(currentPin)) {
      return res.status(401).json({ success: false, error: 'Mã PIN hiện tại không chính xác!' });
    }
    db.updatePin(newPin);
    res.json({ success: true, message: 'Đã đổi mã PIN bảo mật thành công!' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== APP SETTINGS API ==================== //

app.get('/api/settings', (req, res) => {
  const settings = db.getSettings();
  // Don't expose securityPin directly in settings get
  const { securityPin, ...safeSettings } = settings;
  res.json({ success: true, settings: safeSettings });
});

app.post('/api/settings', (req, res) => {
  const { appId, appSecret } = req.body;
  const settings = db.saveSettings({ appId, appSecret });
  res.json({ success: true, settings });
});

// ==================== FACEBOOK ACCOUNTS API ==================== //

app.post('/api/accounts/connect', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng dán Access Token.' });
    }

    const settings = db.getSettings();

    let tokenInfo = { accessToken: token.trim(), isLongLived: false };
    if (settings.appId && settings.appSecret) {
      try {
        tokenInfo = await exchangeForLongLivedToken(token.trim(), settings.appId, settings.appSecret);
      } catch (err) {
        console.warn('Long-lived token exchange warning:', err.message);
      }
    }

    const userToken = tokenInfo.accessToken;
    const pages = await getFacebookPages(userToken);
    const addedAccounts = [];

    for (const page of pages) {
      db.saveAccount(page);
      addedAccounts.push(page);
    }

    res.json({
      success: true,
      tokenInfo,
      accounts: db.getAccounts(),
      addedCount: addedAccounts.length
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/accounts', (req, res) => {
  res.json({ success: true, accounts: db.getAccounts() });
});

app.delete('/api/accounts/:platform/:id', (req, res) => {
  const { platform, id } = req.params;
  const accounts = db.deleteAccount(id, platform);
  res.json({ success: true, accounts });
});

// ==================== MEDIA UPLOAD & POSTS API ==================== //

app.post('/api/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Không nhận được file.' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  const isVideo = req.file.mimetype.startsWith('video');

  res.json({
    success: true,
    fileUrl: fileUrl,
    filename: req.file.filename,
    mediaType: isVideo ? 'video' : 'image',
    size: req.file.size
  });
});

app.get('/api/posts', (req, res) => {
  res.json({ success: true, posts: db.getPosts() });
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, caption, hashtags, firstComment, mediaUrl, mediaType, postFormat, targetAccountIds, scheduledAt, publishNow } = req.body;

    const newPost = db.createPost({
      title,
      caption,
      hashtags,
      firstComment,
      mediaUrl,
      mediaType,
      postFormat,
      platforms: ['facebook'],
      targetAccountIds: targetAccountIds || [],
      scheduledAt
    });

    if (publishNow) {
      executePostPublish(newPost.id).catch(err => console.error('Immediate Publish Error:', err));
    }

    res.json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/posts/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await executePostPublish(id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const posts = db.deletePost(id);
  res.json({ success: true, posts });
});

// Catch-all route to serve index.html for SPA if dist exists
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Facebook Multi-Publisher All-in-One Server running on http://localhost:${PORT}`);
});
