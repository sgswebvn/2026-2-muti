import axios from 'axios';
import { getPublicMediaUrl } from './tunnelService.js';

const THREADS_URL = 'https://graph.threads.net/v1.0';
const GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * Publish Content to Threads Profile
 * @param {Object} threadsAccount { id, accessToken, username }
 * @param {Object} postData { caption, hashtags, mediaUrl, mediaType }
 */
export async function publishToThreads(threadsAccount, postData) {
  const { id: threadsUserId, accessToken } = threadsAccount;
  const fullText = [postData.caption, postData.hashtags].filter(Boolean).join('\n\n');

  try {
    let mediaType = 'TEXT';
    const params = {
      text: fullText,
      access_token: accessToken
    };

    if (postData.mediaUrl) {
      const publicUrl = await getPublicMediaUrl(postData.mediaUrl);
      if (postData.mediaType === 'image') {
        mediaType = 'IMAGE';
        params.image_url = publicUrl;
      } else if (postData.mediaType === 'video') {
        mediaType = 'VIDEO';
        params.video_url = publicUrl;
      }
    }
    params.media_type = mediaType;

    // Determine API Base URL (threads.net or graph.facebook.com fallback)
    let baseUrl = THREADS_URL;
    
    // STEP 1: Create Threads Container
    let containerRes;
    try {
      containerRes = await axios.post(`${baseUrl}/${threadsUserId}/threads`, null, { params });
    } catch (err) {
      // Fallback to Graph API if token is Graph token
      baseUrl = GRAPH_URL;
      containerRes = await axios.post(`${baseUrl}/${threadsUserId}/threads`, null, { params });
    }

    const containerId = containerRes.data.id;

    // Wait for Video Container processing if mediaType === 'VIDEO'
    if (mediaType === 'VIDEO') {
      let isReady = false;
      let attempts = 0;

      while (!isReady && attempts < 25) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;

        const statusRes = await axios.get(`${baseUrl}/${containerId}`, {
          params: { fields: 'status', access_token: accessToken }
        });

        if (statusRes.data.status === 'FINISHED') {
          isReady = true;
        } else if (statusRes.data.status === 'ERROR') {
          throw new Error('Xử lý Video thất bại trên máy chủ Threads.');
        }
      }
    }

    // STEP 2: Publish Threads Container
    const publishRes = await axios.post(`${baseUrl}/${threadsUserId}/threads_publish`, null, {
      params: {
        creation_id: containerId,
        access_token: accessToken
      }
    });

    const threadId = publishRes.data.id;
    return {
      success: true,
      postId: threadId,
      postUrl: `https://www.threads.net/@${threadsAccount.username || 'user'}/post/${threadId}`
    };

  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error('Threads Publishing Error:', error.response?.data || error.message);
    return {
      success: false,
      error: `Threads Error: ${errorDetails}`
    };
  }
}

