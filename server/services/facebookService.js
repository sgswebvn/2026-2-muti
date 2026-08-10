import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * Helper to convert relative media URL (/uploads/media_123.jpg) to local filesystem path
 */
function getLocalFilePath(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.includes('/uploads/')) {
    const filename = mediaUrl.split('/uploads/').pop();
    const filePath = path.resolve('uploads', filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

/**
 * Execute Seeding / Auto Comments on a published Facebook post (Supports multi-line seeding comments)
 */
async function executeAutoSeedingComments(pageId, targetId, accessToken, firstCommentRaw) {
  if (!firstCommentRaw || !targetId) return;

  // Support multiple comments separated by new lines (\n)
  const commentLines = firstCommentRaw
    .split(/\r?\n/)
    .map(c => c.trim())
    .filter(Boolean);

  if (commentLines.length === 0) return;

  // Extract object ID if targetId is in format pageId_objectId
  const objectIdOnly = targetId.includes('_') ? targetId.split('_').pop() : targetId;

  for (const commentText of commentLines) {
    let success = false;
    const bodyForm = new URLSearchParams();
    bodyForm.append('message', commentText);
    bodyForm.append('access_token', accessToken);

    // Attempt 1: POST /{targetId}/comments
    try {
      await axios.post(`${GRAPH_URL}/${targetId}/comments`, bodyForm, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      success = true;
    } catch (err1) {
      // Attempt 2: POST /{objectIdOnly}/comments
      try {
        await axios.post(`${GRAPH_URL}/${objectIdOnly}/comments`, bodyForm, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        success = true;
      } catch (err2) {
        // Attempt 3: POST /{pageId}_{objectIdOnly}/comments
        try {
          await axios.post(`${GRAPH_URL}/${pageId}_${objectIdOnly}/comments`, bodyForm, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
          success = true;
        } catch (err3) {
          console.warn(`Facebook Auto Comment Warning for post ${targetId}:`, err3.response?.data?.error?.message || err3.message);
        }
      }
    }

    // Brief delay between multiple comments to avoid spam triggers
    if (commentLines.length > 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}

/**
 * Fetch Live Comments & Existing Replies for a Facebook Post
 */
export async function getPostLiveComments(pageAccount, postId) {
  const { accessToken } = pageAccount;
  try {
    const res = await axios.get(`${GRAPH_URL}/${postId}/comments`, {
      params: {
        fields: 'id,message,created_time,from{id,name,picture},comments{id,message,created_time,from{id,name,picture}}',
        access_token: accessToken
      }
    });
    return { success: true, comments: res.data?.data || [] };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.warn(`Get live comments error for post ${postId}:`, msg);
    return { success: false, error: msg, comments: [] };
  }
}

/**
 * Reply directly to a comment or post a new comment as Page
 */
export async function postCommentReply(pageAccount, targetId, messageText) {
  const { accessToken } = pageAccount;
  try {
    const bodyForm = new URLSearchParams();
    bodyForm.append('message', messageText.trim());
    bodyForm.append('access_token', accessToken);

    const res = await axios.post(`${GRAPH_URL}/${targetId}/comments`, bodyForm, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { success: true, commentId: res.data?.id };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`Reply comment error for ${targetId}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Auto Reply to Customer Comments on Published Posts
 */
export async function autoReplyCustomerComments(pageAccount, postId, autoReplyMessage) {
  if (!pageAccount || !postId || !autoReplyMessage) return;
  const { id: pageId, accessToken } = pageAccount;

  try {
    // Fetch comments on the post
    const res = await axios.get(`${GRAPH_URL}/${postId}/comments`, {
      params: {
        fields: 'id,message,from,comments{id,from}',
        access_token: accessToken
      }
    });

    const commentsList = res.data?.data || [];
    for (const comment of commentsList) {
      // Skip if comment is from the Page itself
      if (comment.from && comment.from.id === pageId) continue;

      // Check if the page already replied to this comment
      const existingReplies = comment.comments?.data || [];
      const alreadyReplied = existingReplies.some(reply => reply.from && reply.from.id === pageId);

      if (!alreadyReplied) {
        // Post Auto Reply to customer comment
        const bodyForm = new URLSearchParams();
        bodyForm.append('message', autoReplyMessage);
        bodyForm.append('access_token', accessToken);

        await axios.post(`${GRAPH_URL}/${comment.id}/comments`, bodyForm, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log(`Auto replied to comment ${comment.id} on post ${postId}`);
      }
    }
  } catch (err) {
    console.warn(`Auto Reply Comment error for post ${postId}:`, err.response?.data?.error?.message || err.message);
  }
}

/**
 * Publish Content to Facebook Page (Supports Text, Single/Multi Photo, or Video/Reels)
 */
export async function publishToFacebook(pageAccount, postData) {
  const { id: pageId, accessToken } = pageAccount;

  // Build full text with Title as first paragraph if present
  const textParts = [];
  if (postData.title && postData.title.trim()) {
    textParts.push(postData.title.trim());
  }
  if (postData.caption && postData.caption.trim()) {
    textParts.push(postData.caption.trim());
  }
  if (postData.hashtags && postData.hashtags.trim()) {
    textParts.push(postData.hashtags.trim());
  }
  const fullText = textParts.join('\n\n');

  // Standardize mediaUrls list
  let urls = [];
  if (Array.isArray(postData.mediaUrls) && postData.mediaUrls.length > 0) {
    urls = postData.mediaUrls;
  } else if (postData.mediaUrl) {
    urls = [postData.mediaUrl];
  }

  try {
    // 1. Text-Only Feed Post
    if (urls.length === 0) {
      const res = await axios.post(`${GRAPH_URL}/${pageId}/feed`, null, {
        params: {
          message: fullText,
          access_token: accessToken
        }
      });
      const postId = res.data.id;

      await executeAutoSeedingComments(pageId, postId, accessToken, postData.firstComment);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`
      };
    }

    // 2. Photo Post (Single or Multiple Album/Carousel)
    if (postData.mediaType === 'image') {
      if (urls.length === 1) {
        const localFilePath = getLocalFilePath(urls[0]);
        let res;
        if (localFilePath) {
          const form = new FormData();
          form.append('source', fs.createReadStream(localFilePath));
          form.append('caption', fullText);
          form.append('access_token', accessToken);

          res = await axios.post(`${GRAPH_URL}/${pageId}/photos`, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
        } else {
          res = await axios.post(`${GRAPH_URL}/${pageId}/photos`, null, {
            params: {
              url: urls[0],
              caption: fullText,
              access_token: accessToken
            }
          });
        }

        const postId = res.data.post_id || res.data.id;

        await executeAutoSeedingComments(pageId, postId, accessToken, postData.firstComment);

        return {
          success: true,
          postId: postId,
          postUrl: `https://www.facebook.com/${postId}`
        };
      }

      // Multi-Photo Post (Album Feed Post)
      const photoIds = [];
      for (const imgUrl of urls) {
        const localFilePath = getLocalFilePath(imgUrl);
        let photoRes;
        if (localFilePath) {
          const form = new FormData();
          form.append('source', fs.createReadStream(localFilePath));
          form.append('published', 'false');
          form.append('access_token', accessToken);

          photoRes = await axios.post(`${GRAPH_URL}/${pageId}/photos`, form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
        } else {
          photoRes = await axios.post(`${GRAPH_URL}/${pageId}/photos`, null, {
            params: {
              url: imgUrl,
              published: false,
              access_token: accessToken
            }
          });
        }
        if (photoRes.data && photoRes.data.id) {
          photoIds.push(photoRes.data.id);
        }
      }

      const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
      const feedRes = await axios.post(`${GRAPH_URL}/${pageId}/feed`, null, {
        params: {
          message: fullText,
          attached_media: JSON.stringify(attachedMedia),
          access_token: accessToken
        }
      });

      const postId = feedRes.data.id;

      await executeAutoSeedingComments(pageId, postId, accessToken, postData.firstComment);

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`
      };
    }

    // 3. Video / Reels Post
    if (postData.mediaType === 'video') {
      const localFilePath = getLocalFilePath(urls[0]);
      let res;
      if (localFilePath) {
        const form = new FormData();
        form.append('source', fs.createReadStream(localFilePath));
        form.append('description', fullText);
        form.append('title', postData.title || 'Video Reel');
        form.append('access_token', accessToken);

        res = await axios.post(`${GRAPH_URL}/${pageId}/videos`, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });
      } else {
        res = await axios.post(`${GRAPH_URL}/${pageId}/videos`, null, {
          params: {
            file_url: urls[0],
            description: fullText,
            title: postData.title || 'Video Reel',
            access_token: accessToken
          }
        });
      }

      const videoId = res.data.id;

      await executeAutoSeedingComments(pageId, videoId, accessToken, postData.firstComment);

      return {
        success: true,
        postId: videoId,
        postUrl: `https://www.facebook.com/reel/${videoId}`
      };
    }

    throw new Error('Loại media không được hỗ trợ cho Facebook');
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error('Facebook Publishing Error:', error.response?.data || error.message);
    return {
      success: false,
      error: `Facebook Error: ${errorDetails}`
    };
  }
}

/**
 * Verify Access Token Status
 */
export async function checkTokenHealth(accessToken) {
  try {
    const res = await axios.get(`${GRAPH_URL}/me`, {
      params: {
        fields: 'id,name',
        access_token: accessToken
      }
    });
    if (res.data && res.data.id) {
      return { valid: true, id: res.data.id, name: res.data.name };
    }
    return { valid: false, error: 'Phản hồi từ Facebook không hợp lệ' };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return { valid: false, error: msg };
  }
}

/**
 * Fetch Page Roles / Administrators
 */
export async function getPageRoles(pageId, accessToken) {
  try {
    const res = await axios.get(`${GRAPH_URL}/${pageId}/roles`, {
      params: { access_token: accessToken }
    });
    return res.data?.data || [];
  } catch (err) {
    console.warn('Fetch Page Roles warning:', err.response?.data || err.message);
    return [];
  }
}

/**
 * Invite / Assign Role to a Facebook user for a Page
 */
export async function assignPageRole(pageId, userEmailOrId, role, accessToken) {
  try {
    const validRoles = ['ADMINISTER', 'EDIT_PROFILE', 'CREATE_CONTENT', 'MODERATE_COMMENTS', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new Error(`Role không hợp lệ. Các role cho phép: ${validRoles.join(', ')}`);
    }

    const res = await axios.post(`${GRAPH_URL}/${pageId}/roles`, null, {
      params: {
        user: userEmailOrId,
        role: role,
        access_token: accessToken
      }
    });

    return res.data;
  } catch (err) {
    const errorDetails = err.response?.data?.error?.message || err.message;
    throw new Error(errorDetails);
  }
}
