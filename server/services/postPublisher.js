import { db } from '../db.js';
import { publishToFacebook } from './facebookService.js';
import { publishToInstagram } from './instagramService.js';
import { publishToThreads } from './threadsService.js';

/**
 * Execute publishing a post to selected connected accounts
 * @param {string} postId ID of the post in db
 */
export async function executePostPublish(postId) {
  const posts = db.getPosts();
  const post = posts.find(p => p.id === postId);

  if (!post) {
    throw new Error(`Không tìm thấy bài viết với ID ${postId}`);
  }

  // Update status to publishing
  db.updatePost(postId, { status: 'publishing' });

  const accounts = db.getAccounts();
  const targetPlatforms = post.platforms || ['facebook', 'instagram', 'threads'];
  const results = {};

  let successCount = 0;
  let totalCount = 0;

  for (const platform of targetPlatforms) {
    const platformAccounts = accounts.filter(a => a.platform === platform);

    if (platformAccounts.length === 0) {
      totalCount++;
      let errorMsg = `Chưa kết nối tài khoản ${platform.toUpperCase()} nào.`;
      if (platform === 'instagram') {
        errorMsg = 'Chưa có tài khoản Instagram nào được kết nối. Hãy vào Cài đặt Fanpage Meta -> Linked Accounts để liên kết Instagram Business/Creator.';
      } else if (platform === 'threads') {
        errorMsg = 'Chưa kết nối tài khoản Threads. Cần cấp quyền threads_basic & threads_content_publish trong Meta Explorer.';
      }

      results[platform] = {
        success: false,
        error: errorMsg
      };
      continue;
    }

    // Publish to all connected accounts of this platform
    for (const acc of platformAccounts) {
      totalCount++;
      let res;
      if (platform === 'facebook') {
        res = await publishToFacebook(acc, post);
      } else if (platform === 'instagram') {
        res = await publishToInstagram(acc, post);
      } else if (platform === 'threads') {
        res = await publishToThreads(acc, post);
      }

      results[`${platform}_${acc.id}`] = {
        accountName: acc.name,
        platform: platform,
        ...res
      };

      if (res?.success) {
        successCount++;
      }
    }
  }

  // If at least one account published successfully, mark status as 'published'
  const finalStatus = successCount > 0 ? 'published' : 'failed';
  db.updatePost(postId, {
    status: finalStatus,
    results: results,
    publishedAt: new Date().toISOString()
  });

  return {
    postId,
    status: finalStatus,
    results
  };
}

