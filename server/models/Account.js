import mongoose from 'mongoose';
import { encryptText, decryptText } from '../utils/cryptoUtils.js';

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true }, // Facebook Page ID / Social Account ID
  platform: { type: String, enum: ['facebook', 'instagram', 'threads'], default: 'facebook' },
  name: { type: String, required: true, trim: true },
  accessToken: {
    type: String,
    required: true,
    set: function (v) {
      if (!v) return '';
      const str = String(v).trim();
      // If already encrypted (hex string with colon format iv:ciphertext), keep as is
      if (str.includes(':') && str.length > 32) {
        return str;
      }
      return encryptText(str);
    }
  },
  avatar: { type: String, default: '' },
  group: { type: String, default: 'Mặc định' },
  tokenStatus: { type: String, enum: ['active', 'expired', 'invalid', 'warning', 'checkpoint'], default: 'active' },
  tokenError: { type: String, default: null },
  lastCheckedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound unique index so a user cannot duplicate the same account platform+id
accountSchema.index({ userId: 1, platform: 1, id: 1 }, { unique: true });

// Virtual to get decrypted Access Token
accountSchema.methods.getDecryptedToken = function () {
  return this.accessToken ? decryptText(this.accessToken) : '';
};

// Method to set encrypted Access Token
accountSchema.methods.setEncryptedToken = function (token) {
  this.accessToken = token ? encryptText(token) : '';
};

export const Account = mongoose.model('Account', accountSchema);
