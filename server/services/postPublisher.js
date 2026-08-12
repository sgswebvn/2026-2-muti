import { db } from '../db.js';
import { publishToFacebook } from './facebookService.js';

/**
 * Execute publishing a post to selected connected Facebook Pages
 * @param {string} postId ID of the post in db
 * @param {string} userId ID of the logged-in user
 */
export async function executePostPublish(postId, userId) {
  const posts = await db.getPosts(userId);
  const post = posts.find(p => p.id === postId || p._id === postId || String(p.id) === String(postId));

  if (!post) {
    throw new Error(`Không tìm thấy bài viết với ID ${postId}`);
  }

  // Update status to publishing
  await db.updatePost(userId, postId, { status: 'publishing' });

  const accounts = (await db.getAccounts(userId)).filter(a => a.platform === 'facebook');
  const results = {};

  // Filter by user-selected target Facebook Page IDs if specified
  let targetPages = accounts;
  if (post.targetAccountIds && Array.isArray(post.targetAccountIds) && post.targetAccountIds.length > 0) {
    const targetSet = new Set(post.targetAccountIds.map(String));
    targetPages = accounts.filter(a => targetSet.has(String(a.id)));
  }

  if (targetPages.length === 0) {
    await db.updatePost(userId, postId, {
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

  for (let i = 0; i < targetPages.length; i++) {
    const pageAcc = targetPages[i];

    try {
      // Check if there is a unique AI variation for this specific Fanpage
      const customPostPayload = (post.accountVariations && post.accountVariations[pageAcc.id])
        ? { ...post, ...post.accountVariations[pageAcc.id] }
        : post;

      if (customPostPayload.hashtags && Array.isArray(customPostPayload.hashtags)) {
        customPostPayload.hashtags = customPostPayload.hashtags.join(' ');
      }

      const res = await publishToFacebook(pageAcc, customPostPayload);

      // If checkpoint error is returned, update account tokenStatus in DB
      if (res?.isCheckpoint) {
        await db.updateAccountStatus(userId, pageAcc.id, 'facebook', 'checkpoint', res.error);
      }

      results[`facebook_${pageAcc.id}`] = {
        accountName: pageAcc.name,
        platform: 'facebook',
        pageId: pageAcc.id,
        usedVariation: Boolean(post.accountVariations && post.accountVariations[pageAcc.id]),
        ...res
      };

      if (res?.success) {
        successCount++;
      }
    } catch (pageErr) {
      console.error(`[PostPublisher Error] Failed publishing to page ${pageAcc.name} (${pageAcc.id}):`, pageErr.message);
      results[`facebook_${pageAcc.id}`] = {
        accountName: pageAcc.name,
        platform: 'facebook',
        pageId: pageAcc.id,
        success: false,
        error: pageErr.message || 'Lỗi kết nối khi gửi bài tới Facebook'
      };
    }

    // Rate-limiting delay: 2 seconds between multiple target pages
    if (targetPages.length > 1 && i < targetPages.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Final post status
  const finalStatus = successCount > 0 ? 'published' : 'failed';
  await db.updatePost(userId, postId, {
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
