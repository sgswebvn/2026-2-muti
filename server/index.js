import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db.js';
import { exchangeForLongLivedToken, getFacebookPages } from './services/accountService.js';
import { executePostPublish } from './services/postPublisher.js';
import { initScheduler } from './services/scheduler.js';
import { checkTokenHealth, getPageRoles, assignPageRole, getPostLiveComments, postCommentReply } from './services/facebookService.js';
import { generateAiContent, suggestAiCommentReply, analyzeVideoContent } from './services/aiService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploads and public folders statically
const UPLOADS_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

const PUBLIC_DIR = path.resolve('public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'privacy-policy.html'));
});

app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'terms-of-service.html'));
});

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

// Check PIN configured status
app.get('/api/auth/pin-status', (req, res) => {
  res.json({ success: true, isPinConfigured: db.isPinConfigured() });
});

// Initial PIN Setup
app.post('/api/auth/setup-pin', (req, res) => {
  try {
    const { newPin } = req.body;
    db.updatePin(newPin);
    res.json({ success: true, message: 'Khởi tạo mã PIN bảo mật thành công!' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

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
  const { securityPin, ...safeSettings } = settings;
  res.json({ success: true, settings: safeSettings });
});

app.post('/api/settings', (req, res) => {
  const { appId, appSecret, openaiApiKey, grokApiKey } = req.body;
  const settings = db.saveSettings({ appId, appSecret, openaiApiKey, grokApiKey });
  const { securityPin, ...safeSettings } = settings;
  res.json({ success: true, settings: safeSettings });
});

// ==================== FACEBOOK ACCOUNTS & ROLES API ==================== //

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
      db.saveAccount({ ...page, tokenStatus: 'active', lastCheckedAt: new Date().toISOString() });
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

app.put('/api/accounts/:platform/:id/group', (req, res) => {
  try {
    const { platform, id } = req.params;
    const { group } = req.body;
    const acc = db.updateAccountGroup(id, platform, group);
    res.json({ success: true, account: acc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/accounts/:platform/:id', (req, res) => {
  try {
    const { platform, id } = req.params;
    const accounts = db.deleteAccount(id, platform);
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/:platform/:id/check-token', async (req, res) => {
  try {
    const { platform, id } = req.params;
    const accounts = db.getAccounts();
    const account = accounts.find(a => a.id === id && a.platform === platform);
    if (!account) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });

    const statusResult = await checkTokenHealth(account);
    const updatedAcc = db.updateAccountStatus(id, platform, statusResult.status, statusResult.error);
    res.json({ success: true, account: updatedAcc, health: statusResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Page Roles API
app.get('/api/accounts/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    const accounts = db.getAccounts();
    const account = accounts.find(a => a.id === id && a.platform === 'facebook');
    if (!account) return res.status(404).json({ success: false, error: 'Không tìm thấy Fanpage.' });

    const roles = await getPageRoles(account);
    res.json({ success: true, roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, role } = req.body;
    const accounts = db.getAccounts();
    const account = accounts.find(a => a.id === id && a.platform === 'facebook');
    if (!account) return res.status(404).json({ success: false, error: 'Không tìm thấy Fanpage.' });

    const result = await assignPageRole(account, userEmail, role);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== MEDIA UPLOADS API ==================== //

app.post('/api/upload', upload.array('media', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có tệp media nào được tải lên.' });
    }

    const fileUrls = req.files.map(f => `/uploads/${f.filename}`);
    const firstMime = req.files[0].mimetype;
    const mediaType = firstMime.startsWith('video/') ? 'video' : 'image';

    res.json({
      success: true,
      mediaUrls: fileUrls,
      fileUrl: fileUrls[0],
      originalName: req.files[0].originalname,
      mediaType: mediaType
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== POSTS & PUBLISHING API ==================== //

app.get('/api/posts', (req, res) => {
  res.json({ success: true, posts: db.getPosts() });
});

app.post('/api/posts', (req, res) => {
  try {
    const { 
      title, 
      caption, 
      hashtags, 
      firstComment, 
      autoReplyMessage,
      mediaUrl, 
      mediaUrls, 
      mediaType, 
      postFormat,
      targetAccountIds, 
      publishNow, 
      scheduledAt 
    } = req.body;

    const newPost = db.createPost({
      title,
      caption,
      hashtags,
      firstComment,
      autoReplyMessage,
      mediaUrl,
      mediaUrls,
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

app.put('/api/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const post = db.updatePost(id, updates);
    if (!post) return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết.' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// ==================== AI GENERATOR & VIDEO ANALYSIS API ==================== //

app.post('/api/ai/generate', async (req, res) => {
  try {
    const result = await generateAiContent(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ai/analyze-video', async (req, res) => {
  try {
    const result = await analyzeVideoContent(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Customer Reply Suggestion
app.post('/api/ai/suggest-reply', async (req, res) => {
  try {
    const { comment, postTopic } = req.body;
    const replyText = await suggestAiCommentReply(comment || '', postTopic || '');
    res.json({ success: true, replyText });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== LIVE COMMENTS & REPLY MANAGEMENT API ==================== //

app.get('/api/accounts/:accId/posts/:postId/comments', async (req, res) => {
  try {
    const { accId, postId } = req.params;
    const account = db.getAccounts().find(a => a.id === accId);
    if (!account) return res.status(404).json({ success: false, error: 'Không tìm thấy Fanpage.' });

    const result = await getPostLiveComments(account, postId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/:accId/posts/:postId/comments', async (req, res) => {
  try {
    const { accId } = req.params;
    const { targetId, message } = req.body;
    const account = db.getAccounts().find(a => a.id === accId);
    if (!account) return res.status(404).json({ success: false, error: 'Không tìm thấy Fanpage.' });
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Bình luận không được để trống.' });

    const result = await postCommentReply(account, targetId, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
