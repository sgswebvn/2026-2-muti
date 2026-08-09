import axios from 'axios';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';
const THREADS_URL = 'https://graph.threads.net/v1.0';

/**
 * Exchange short-lived User Access Token for 60-day Long-Lived User Access Token
 */
export async function exchangeForLongLivedToken(shortToken, appId, appSecret) {
  try {
    if (!appId || !appSecret) {
      // If App ID / Secret not set, return token as is with notice
      return {
        accessToken: shortToken,
        isLongLived: false,
        expiresIn: null,
        notice: 'Vui lòng cung cấp App ID và App Secret để đổi sang Long-Lived Token 60 ngày.'
      };
    }

    const response = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken
      }
    });

    return {
      accessToken: response.data.access_token,
      isLongLived: true,
      expiresIn: response.data.expires_in, // seconds (usually ~5184000 = 60 days)
      tokenType: response.data.token_type
    };
  } catch (error) {
    console.error('Token Exchange Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Không thể đổi Long-Lived Token. Vui lòng kiểm tra App ID/Secret.');
  }
}

/**
 * Fetch all Facebook Pages owned/managed by the user token
 */
export async function getFacebookPages(userAccessToken) {
  try {
    const res = await axios.get(`${GRAPH_URL}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,category,picture.type(large)',
        access_token: userAccessToken
      }
    });
    
    return res.data.data.map(page => ({
      id: page.id,
      name: page.name,
      category: page.category,
      accessToken: page.access_token,
      avatar: page.picture?.data?.url || '',
      platform: 'facebook'
    }));
  } catch (error) {
    console.error('Fetch Facebook Pages Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Lỗi kết nối Facebook API');
  }
}

/**
 * Fetch linked Instagram Business/Creator account for a Facebook Page
 */
export async function getInstagramAccountForPage(pageId, pageAccessToken) {
  try {
    const res = await axios.get(`${GRAPH_URL}/${pageId}`, {
      params: {
        fields: 'instagram_business_account{id,username,name,profile_picture_url}',
        access_token: pageAccessToken
      }
    });

    const igAccount = res.data.instagram_business_account;
    if (!igAccount) return null;

    return {
      id: igAccount.id,
      name: igAccount.name || igAccount.username,
      username: igAccount.username,
      avatar: igAccount.profile_picture_url || '',
      pageId: pageId,
      accessToken: pageAccessToken, // Uses the connected Facebook Page access token
      platform: 'instagram'
    };
  } catch (error) {
    console.error(`Fetch Instagram for Page ${pageId} Error:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch Threads account profile using User/Threads Access Token
 */
export async function getThreadsProfile(threadsToken) {
  try {
    // Try Threads API first
    const res = await axios.get(`${THREADS_URL}/me`, {
      params: {
        fields: 'id,username,threads_profile_picture_url,threads_biography',
        access_token: threadsToken
      }
    });

    return {
      id: res.data.id,
      name: res.data.username,
      username: res.data.username,
      avatar: res.data.threads_profile_picture_url || '',
      accessToken: threadsToken,
      platform: 'threads'
    };
  } catch (error) {
    // Fallback: If token was a Meta Graph token with threads permissions, try Graph API endpoint
    try {
      const resMeta = await axios.get(`${GRAPH_URL}/me`, {
        params: {
          fields: 'id,name,picture',
          access_token: threadsToken
        }
      });
      return {
        id: resMeta.data.id,
        name: resMeta.data.name,
        username: resMeta.data.name,
        avatar: resMeta.data.picture?.data?.url || '',
        accessToken: threadsToken,
        platform: 'threads'
      };
    } catch (fallbackError) {
      console.error('Fetch Threads Profile Error:', error.response?.data || error.message);
      throw new Error('Không thể lấy thông tin tài khoản Threads. Vui lòng kiểm tra quyền threads_basic.');
    }
  }
}
