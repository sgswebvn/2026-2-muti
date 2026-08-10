import fs from 'fs';
import path from 'path';
import { db } from '../db.js';

const UPLOADS_DIR = path.resolve('uploads');

/**
 * Clean up old unreferenced media files from uploads/ folder
 * @param {number} maxAgeDays Default 7 days
 */
export function cleanUploadsFolder(maxAgeDays = 7) {
  if (!fs.existsSync(UPLOADS_DIR)) return { deletedCount: 0, freedBytes: 0 };

  try {
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    // Get list of media filenames currently referenced in posts DB
    const posts = db.getPosts();
    const activeFilenames = new Set();

    for (const post of posts) {
      const urls = Array.isArray(post.mediaUrls) ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
      for (const url of urls) {
        if (url && url.includes('/uploads/')) {
          const filename = url.split('/uploads/').pop();
          if (filename) activeFilenames.add(filename);
        }
      }
    }

    const files = fs.readdirSync(UPLOADS_DIR);
    let deletedCount = 0;
    let freedBytes = 0;

    for (const file of files) {
      // Keep .gitkeep or system hidden files
      if (file.startsWith('.')) continue;

      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;

        const ageMs = now - stats.mtimeMs;
        // If file is older than maxAgeDays AND not referenced in DB
        if (ageMs > maxAgeMs && !activeFilenames.has(file)) {
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (err) {
        console.warn(`[Cleanup] Error processing file ${file}:`, err.message);
      }
    }

    if (deletedCount > 0) {
      const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
      console.log(`[Cleanup Service] Deleted ${deletedCount} expired media file(s), freed ${freedMB} MB.`);
    }

    return { deletedCount, freedBytes };
  } catch (error) {
    console.error('[Cleanup Service Error]:', error);
    return { deletedCount: 0, freedBytes: 0, error: error.message };
  }
}
