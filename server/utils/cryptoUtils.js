import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const KEY_FILE = path.join(DATA_DIR, '.secret_key');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Get or generate 32-byte secret key
function getSecretKey() {
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
    return Buffer.from(process.env.ENCRYPTION_KEY.substring(0, 32));
  }

  if (fs.existsSync(KEY_FILE)) {
    try {
      const hexKey = fs.readFileSync(KEY_FILE, 'utf-8').trim();
      if (hexKey.length === 64) {
        return Buffer.from(hexKey, 'hex');
      }
    } catch (e) {}
  }

  // Generate new 32-byte key and save securely
  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(KEY_FILE, newKey.toString('hex'), 'utf-8');
  } catch (e) {
    console.warn('Warning: Could not persist secret key to disk:', e.message);
  }
  return newKey;
}

const SECRET_KEY = getSecretKey();
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt plaintext string to AES-256-CBC format (enc:<iv>:<ciphertext>)
 */
export function encryptText(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('enc:')) return text; // Already encrypted

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return text;
  }
}

/**
 * Decrypt string encrypted with AES-256-CBC format
 */
export function decryptText(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.startsWith('enc:')) return encryptedText; // Not encrypted

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err.message);
    return encryptedText;
  }
}
