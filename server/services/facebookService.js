import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * Extract filename from local URL or path
 */
function getLocalFilePath(mediaUrl) {
  if (!mediaUrl) return null;
  
  // If it's a URL like http://localhost:5000/uploads/media_xxx.jpg
  if (mediaUrl.includes('/uploads/')) {
    const filename = mediaUrl.split('/uploads/').pop();
    const localPath = path.resolve('uploads', filename);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
  }
  return null;
}

/**
 * Publish Content to Facebook Page (Supports Text, Single/Multi Photo, or Video/Reels)
 * @param {Object} pageAccount { id, accessToken, name }
 * @param {Object} postData { caption, hashtags, mediaUrl, mediaUrls, mediaType, title }
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

      if (postData.firstComment && postId) {
        try {
          await axios.post(`${GRAPH_URL}/${postId}/comments`, null, {
            params: {
              message: postData.firstComment,
              access_token: accessToken
            }
          });
        } catch (commentErr) {
          console.warn('Facebook Feed Auto First Comment Warning:', commentErr.response?.data || commentErr.message);
        }
      }

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

        if (postData.firstComment && postId) {
          try {
            await axios.post(`${GRAPH_URL}/${postId}/comments`, null, {
              params: { message: postData.firstComment, access_token: accessToken }
            });
          } catch (e) {}
        }

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

      if (postData.firstComment && postId) {
        try {
          await axios.post(`${GRAPH_URL}/${postId}/comments`, null, {
            params: { message: postData.firstComment, access_token: accessToken }
          });
        } catch (e) {}
      }

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

      if (postData.firstComment && videoId) {
        try {
          await axios.post(`${GRAPH_URL}/${videoId}/comments`, null, {
            params: { message: postData.firstComment, access_token: accessToken }
          });
        } catch (e) {}
      }

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
    const res = await axios.post(`${GRAPH_URL}/${pageId}/roles`, null, {
      params: {
        user: userEmailOrId,
        role: role || 'CREATE_CONTENT',
        access_token: accessToken
      }
    });
    return { success: true, data: res.data };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`Lỗi mời Vai trò Fanpage: ${msg}`);
  }
}

