import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encryptText, decryptText } from '../utils/crypto.js';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  
  // User isolated settings (Meta App Credentials & AI Keys)
  apiSettings: {
    appId: { type: String, default: '' },
    appSecret: { type: String, default: '' },
    openaiApiKey: { type: String, default: '' },
    grokApiKey: { type: String, default: '' },
    geminiApiKey: { type: String, default: '' }
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get decrypted safe settings object for runtime use
userSchema.methods.getDecryptedSettings = function () {
  const raw = this.apiSettings || {};
  return {
    appId: raw.appId || '',
    appSecret: raw.appSecret ? decryptText(raw.appSecret) : '',
    openaiApiKey: raw.openaiApiKey ? decryptText(raw.openaiApiKey) : '',
    grokApiKey: raw.grokApiKey ? decryptText(raw.grokApiKey) : '',
    geminiApiKey: raw.geminiApiKey ? decryptText(raw.geminiApiKey) : ''
  };
};

// Partial Update and encrypt settings without overwriting missing fields
userSchema.methods.saveDecryptedSettings = function (newSettings = {}) {
  const current = this.apiSettings || {};
  const updated = {
    appId: current.appId || '',
    appSecret: current.appSecret || '',
    openaiApiKey: current.openaiApiKey || '',
    grokApiKey: current.grokApiKey || '',
    geminiApiKey: current.geminiApiKey || ''
  };

  for (const [k, v] of Object.entries(newSettings)) {
    if (v === undefined || v === null) continue; // PRESERVE existing value if undefined/null!
    let val = String(v);
    if (['appSecret', 'openaiApiKey', 'grokApiKey', 'geminiApiKey'].includes(k)) {
      val = val ? encryptText(val) : '';
    }
    updated[k] = val;
  }
  this.apiSettings = updated;
};

export const User = mongoose.model('User', userSchema);
