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
 * Publish Content to Facebook Page (Supports Text, Photo, or Video/Reels)
 * @param {Object} pageAccount { id, accessToken, name }
 * @param {Object} postData { caption, hashtags, mediaUrl, mediaType, title }
 */
export async function publishToFacebook(pageAccount, postData) {
  const { id: pageId, accessToken } = pageAccount;
  const fullText = [postData.caption, postData.hashtags].filter(Boolean).join('\n\n');

  try {
    // 1. Text-Only Feed Post
    if (!postData.mediaUrl) {
      const res = await axios.post(`${GRAPH_URL}/${pageId}/feed`, null, {
        params: {
          message: fullText,
          access_token: accessToken
        }
      });
      const postId = res.data.id;

      // Auto First Comment if specified
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

    const localFilePath = getLocalFilePath(postData.mediaUrl);

    // 2. Photo Post
    if (postData.mediaType === 'image') {
      let res;
      if (localFilePath) {
        // Direct Binary Upload using FormData (Works on localhost!)
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
        // Public Remote URL
        res = await axios.post(`${GRAPH_URL}/${pageId}/photos`, null, {
          params: {
            url: postData.mediaUrl,
            caption: fullText,
            access_token: accessToken
          }
        });
      }

      const postId = res.data.post_id || res.data.id;

      // Auto First Comment if specified
      if (postData.firstComment && postId) {
        try {
          await axios.post(`${GRAPH_URL}/${postId}/comments`, null, {
            params: {
              message: postData.firstComment,
              access_token: accessToken
            }
          });
        } catch (commentErr) {
          console.warn('Facebook Auto First Comment Warning:', commentErr.response?.data || commentErr.message);
        }
      }

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`
      };
    }

    // 3. Video / Reels Post
    if (postData.mediaType === 'video') {
      let res;
      if (localFilePath) {
        // Direct Binary Video Upload using FormData (Works on localhost!)
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
        // Public Remote URL
        res = await axios.post(`${GRAPH_URL}/${pageId}/videos`, null, {
          params: {
            file_url: postData.mediaUrl,
            description: fullText,
            title: postData.title || 'Video Reel',
            access_token: accessToken
          }
        });
      }

      const videoId = res.data.id;

      // Auto First Comment if specified
      if (postData.firstComment && videoId) {
        try {
          await axios.post(`${GRAPH_URL}/${videoId}/comments`, null, {
            params: {
              message: postData.firstComment,
              access_token: accessToken
            }
          });
        } catch (commentErr) {
          console.warn('Facebook Video Auto First Comment Warning:', commentErr.response?.data || commentErr.message);
        }
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

