import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { migrateJsonDataForUser } from '../scripts/migrateJsonToMongo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026_meta_publisher';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ Tên, Email và Mật khẩu.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email này đã được đăng ký tài khoản.' });
    }

    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'user';

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    await user.save();

    // If this is the first user (admin), automatically migrate any local db.json data to MongoDB for this user
    if (role === 'admin') {
      try {
        await migrateJsonDataForUser(user._id);
      } catch (migErr) {
        console.warn('[Migration Notice]', migErr.message);
      }
    }

    const token = generateToken(user._id);
    const decryptedSettings = user.getDecryptedSettings();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: decryptedSettings
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Email và Mật khẩu.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = generateToken(user._id);
    const decryptedSettings = user.getDecryptedSettings();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: decryptedSettings
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = req.user;
    const decryptedSettings = user.getDecryptedSettings();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: decryptedSettings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const user = req.user;
    const partialSettings = {};

    if (req.body.appId !== undefined) partialSettings.appId = req.body.appId;
    if (req.body.appSecret !== undefined) partialSettings.appSecret = req.body.appSecret;
    if (req.body.openaiApiKey !== undefined) partialSettings.openaiApiKey = req.body.openaiApiKey;
    if (req.body.grokApiKey !== undefined) partialSettings.grokApiKey = req.body.grokApiKey;
    if (req.body.geminiApiKey !== undefined) partialSettings.geminiApiKey = req.body.geminiApiKey;

    user.saveDecryptedSettings(partialSettings);
    await user.save();

    const decryptedSettings = user.getDecryptedSettings();

    res.json({
      success: true,
      settings: decryptedSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
