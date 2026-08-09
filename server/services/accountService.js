import axios from 'axios';

const GRAPH_URL = 'https://graph.facebook.com/v20.0';

/**
 * Exchange short-lived User Access Token for 60-day Long-Lived User Access Token
 */
export async function exchangeForLongLivedToken(shortToken, appId, appSecret) {
  try {
    if (!appId || !appSecret) {
      return {
        accessToken: shortToken,
        isLongLived: false,
        expiresIn: null,
        notice: 'Cung cấp App ID và App Secret để tự động đổi sang Long-Lived Token 60 ngày.'
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
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    console.error('Token Exchange Error:', msg);
    throw new Error(`Lỗi đổi Long-Lived Token: ${msg}`);
  }
}

/**
 * Fetch all Facebook Pages owned or managed by the provided Access Token
 */
export async function getFacebookPages(userAccessToken) {
  try {
    const res = await axios.get(`${GRAPH_URL}/me/accounts`, {
      params: {
        fields: 'id,name,access_token,category,picture.type(large)',
        access_token: userAccessToken
      }
    });

    if (!res.data.data || res.data.data.length === 0) {
      // If /me/accounts returns empty, check if token itself belongs directly to a single Page
      try {
        const pageRes = await axios.get(`${GRAPH_URL}/me`, {
          params: {
            fields: 'id,name,category,picture.type(large)',
            access_token: userAccessToken
          }
        });
        if (pageRes.data && pageRes.data.id) {
          return [{
            id: pageRes.data.id,
            name: pageRes.data.name,
            category: pageRes.data.category || 'Facebook Page',
            accessToken: userAccessToken,
            avatar: pageRes.data.picture?.data?.url || '',
            platform: 'facebook'
          }];
        }
      } catch (e) {
        // Ignore single page fallback error
      }
      throw new Error('Không tìm thấy Fanpage nào thuộc quyền quản lý của Access Token này. Vui lòng cấp quyền pages_show_list và pages_manage_posts.');
    }
    
    return res.data.data.map(page => ({
      id: page.id,
      name: page.name,
      category: page.category || 'Facebook Page',
      accessToken: page.access_token,
      avatar: page.picture?.data?.url || '',
      platform: 'facebook'
    }));
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    console.error('Fetch Facebook Pages Error:', error.response?.data || error.message);
    throw new Error(`Lỗi kết nối Facebook: ${errorDetails}`);
  }
}
