import { db } from '../db.js';
import { publishToFacebook } from './facebookService.js';

/**
 * Execute publishing a post to selected connected Facebook Pages
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

  const accounts = db.getAccounts().filter(a => a.platform === 'facebook');
  const results = {};

  // Filter by user-selected target Facebook Page IDs if specified
  let targetPages = accounts;
  if (post.targetAccountIds && Array.isArray(post.targetAccountIds) && post.targetAccountIds.length > 0) {
    targetPages = accounts.filter(a => post.targetAccountIds.includes(a.id));
  }

  if (targetPages.length === 0) {
    db.updatePost(postId, {
      status: 'failed',
      results: {
        facebook: {
          success: false,
          error: 'Chưa chọn Fanpage nào hoặc chưa kết nối tài khoản Facebook.'
        }
      }
    });
    return { postId, status: 'failed', results };
  }

  let successCount = 0;

  for (const pageAcc of targetPages) {
    const res = await publishToFacebook(pageAcc, post);

    results[`facebook_${pageAcc.id}`] = {
      accountName: pageAcc.name,
      platform: 'facebook',
      pageId: pageAcc.id,
      ...res
    };

    if (res?.success) {
      successCount++;
    }
  }

  // Final post status
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
