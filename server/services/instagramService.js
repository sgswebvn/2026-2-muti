import axios from 'axios';
import { getPublicMediaUrl } from './tunnelService.js';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * Publish Content to Instagram Business Account (Photo or Video Reels)
 * @param {Object} igAccount { id, accessToken, username }
 * @param {Object} postData { caption, hashtags, mediaUrl, mediaType }
 */
export async function publishToInstagram(igAccount, postData) {
  const { id: igUserId, accessToken } = igAccount;
  const fullText = [postData.caption, postData.hashtags].filter(Boolean).join('\n\n');

  if (!postData.mediaUrl) {
    return {
      success: false,
      error: 'Instagram Graph API bắt buộc phải có Video hoặc Hình ảnh.'
    };
  }

  try {
    let containerId = null;
    const publicUrl = await getPublicMediaUrl(postData.mediaUrl);

    // STEP 1: Create Container
    if (postData.mediaType === 'image') {
      const containerRes = await axios.post(`${GRAPH_URL}/${igUserId}/media`, null, {
        params: {
          image_url: publicUrl,
          caption: fullText,
          access_token: accessToken
        }
      });
      containerId = containerRes.data.id;
    } else if (postData.mediaType === 'video') {
      const containerRes = await axios.post(`${GRAPH_URL}/${igUserId}/media`, null, {
        params: {
          media_type: 'REELS',
          video_url: publicUrl,
          caption: fullText,
          access_token: accessToken
        }
      });
      containerId = containerRes.data.id;

      // Wait for Video Container processing to finish
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 * 4s = 120s max

      while (!isReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        attempts++;

        const statusRes = await axios.get(`${GRAPH_URL}/${containerId}`, {
          params: {
            fields: 'status_code,status',
            access_token: accessToken
          }
        });

        const statusCode = statusRes.data.status_code;
        if (statusCode === 'FINISHED') {
          isReady = true;
        } else if (statusCode === 'ERROR') {
          throw new Error('Xử lý Video Reel bị lỗi trên máy chủ Instagram.');
        }
      }

      if (!isReady) {
        throw new Error('Thời gian chờ Instagram xử lý Video Reel quá lâu. Vui lòng thử lại sau.');
      }
    }

    // STEP 2: Publish Container
    const publishRes = await axios.post(`${GRAPH_URL}/${igUserId}/media_publish`, null, {
      params: {
        creation_id: containerId,
        access_token: accessToken
      }
    });

    const mediaId = publishRes.data.id;
    return {
      success: true,
      postId: mediaId,
      postUrl: `https://www.instagram.com/p/${mediaId}/`
    };

  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error('Instagram Publishing Error:', error.response?.data || error.message);
    return {
      success: false,
      error: `Instagram Error: ${errorDetails}`
    };
  }
}

