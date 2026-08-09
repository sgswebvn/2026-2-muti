import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db.js';
import { 
  exchangeForLongLivedToken, 
  getFacebookPages, 
  getInstagramAccountForPage, 
  getThreadsProfile 
} from './services/accountService.js';
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

// Configure Multer for local media storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
const upload = multer({ storage });

// Initialize Scheduler Worker
initScheduler();

// ==================== API ROUTES ==================== //

// 1. Get / Save Meta App Settings (App ID & App Secret)
app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.post('/api/settings', (req, res) => {
  const { appId, appSecret } = req.body;
  const settings = db.saveSettings({ appId, appSecret });
  res.json({ success: true, settings });
});

// 2. Connect Meta Access Token (Fetch Pages, IG, Threads & Convert Token)
app.post('/api/accounts/connect', async (req, res) => {
  try {
    const { token, type } = req.body; // type: 'facebook' | 'threads'
    if (!token) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp Access Token.' });
    }

    const settings = db.getSettings();

    // 1. Try to convert short-lived token to long-lived (if App ID/Secret exist)
    let tokenInfo = { accessToken: token, isLongLived: false };
    if (settings.appId && settings.appSecret) {
      try {
        tokenInfo = await exchangeForLongLivedToken(token, settings.appId, settings.appSecret);
      } catch (err) {
        console.warn('Long lived token exchange warning:', err.message);
      }
    }

    const userToken = tokenInfo.accessToken;
    const addedAccounts = [];

    if (type === 'threads') {
      // Connect Threads Account
      const threadsProfile = await getThreadsProfile(userToken);
      db.saveAccount(threadsProfile);
      addedAccounts.push(threadsProfile);
    } else {
      // Connect Facebook Pages & linked Instagram accounts
      const pages = await getFacebookPages(userToken);

      for (const page of pages) {
        // Save Page Account
        db.saveAccount(page);
        addedAccounts.push(page);

        // Check for connected Instagram Business account
        const igAcc = await getInstagramAccountForPage(page.id, page.accessToken);
        if (igAcc) {
          db.saveAccount(igAcc);
          addedAccounts.push(igAcc);
        }
      }

      // Also try threads check with same token
      try {
        const threadsProfile = await getThreadsProfile(userToken);
        db.saveAccount(threadsProfile);
        addedAccounts.push(threadsProfile);
      } catch (e) {
        // Threads token scope not included, skip silently
      }
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

// 3. Get All Connected Accounts
app.get('/api/accounts', (req, res) => {
  res.json({ success: true, accounts: db.getAccounts() });
});

// 4. Delete Account
app.delete('/api/accounts/:platform/:id', (req, res) => {
  const { platform, id } = req.params;
  const accounts = db.deleteAccount(id, platform);
  res.json({ success: true, accounts });
});

// 5. Upload File (Video or Image)
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

// 6. Posts Endpoints (Get, Create, Publish, Delete)
app.get('/api/posts', (req, res) => {
  res.json({ success: true, posts: db.getPosts() });
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, caption, hashtags, mediaUrl, mediaType, platforms, scheduledAt, publishNow } = req.body;

    const newPost = db.createPost({
      title,
      caption,
      hashtags,
      mediaUrl,
      mediaType,
      platforms,
      scheduledAt
    });

    // If "Publish Now" selected, execute immediately
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

app.listen(PORT, () => {
  console.log(`🚀 Meta Suite Backend Server running on http://localhost:${PORT}`);
});
