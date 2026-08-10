import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { getPublicMediaUrl } from './tunnelService.js';

/**
 * Legacy compatibility wrapper for AI Content Generation
 */
export async function generateAiContent(options = {}) {
  return analyzeVideoContent(options);
}

/**
 * Helper to convert video relative URL to local file path
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
 * Analyze Video Upload using Super Grok 4.5 / Grok Vision or ChatGPT (OpenAI)
 * Returns English Title, concise English Video Analysis Summary, and Hashtags
 * @param {Object} options { videoUrl, videoPrompt, model: 'grok' | 'chatgpt' }
 */
export async function analyzeVideoContent(options = {}) {
  const { videoUrl = '', videoPrompt = '', model = 'grok' } = options;
  const settings = db.getSettings();
  const grokApiKey = (settings.grokApiKey || process.env.GROK_API_KEY || '').trim();
  const openaiApiKey = (settings.openaiApiKey || process.env.OPENAI_API_KEY || '').trim();
  const filename = videoUrl ? videoUrl.split('/').pop() : 'Uploaded Video';

  console.log(`[AI Service] Analyzing video "${filename}" using model: "${model}". Grok Key present: ${Boolean(grokApiKey)}, OpenAI Key present: ${Boolean(openaiApiKey)}`);

  // Obtain public or local file path
  let publicUrl = videoUrl;
  try {
    if (videoUrl.includes('/uploads/')) {
      publicUrl = await getPublicMediaUrl(videoUrl);
    }
  } catch (e) { }

  // ================= 1. MODEL: Super Grok (xAI API) ================= //
  if (model === 'grok') {
    if (!grokApiKey) {
      return {
        success: false,
        error: 'Chưa cấu hình Grok API Key! Vui lòng bấm vào nút "Cấu Hình API Keys" và dán mã Key từ console.x.ai vào.'
      };
    }

    // List of models to try in order of preference
    const grokModels = ['grok-2-vision-1212', 'grok-2-latest', 'grok-4.5'];
    let lastError = null;

    for (const modelName of grokModels) {
      try {
        console.log(`[Grok API] Requesting completion with model: ${modelName}...`);

        const systemPrompt = 'You are Super Grok 4.5 AI Video Intelligence. Analyze the video file metadata and context. Return ONLY raw valid JSON format (no markdown blocks or backticks): {"englishTitle": "Catchy short English title for social post", "summaryAnalysis": "Concise 2-3 sentence English video summary content for post caption.", "hashtags": "#ViralVideo #SuperGrok"}';
        const userPromptText = `Video File: ${filename}\nPublic/Local URL: ${publicUrl}\nUser Instructions: ${videoPrompt || 'Analyze video content and generate engaging viral English title & caption summary.'}`;

        // Construct vision payload if public URL exists
        const userContent = publicUrl.startsWith('http') && (modelName.includes('vision') || modelName.includes('2'))
          ? [
            { type: 'text', text: userPromptText },
            { type: 'image_url', image_url: { url: publicUrl } }
          ]
          : userPromptText;

        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.5
        }, {
          headers: {
            'Authorization': `Bearer ${grokApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        });

        const contentText = response.data.choices[0]?.message?.content;
        console.log(`[Grok API Success] Raw response from ${modelName}:`, contentText);

        const cleanJsonStr = contentText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJsonStr);

        return {
          success: true,
          source: `Super Grok AI (xAI ${modelName})`,
          englishTitle: parsed.englishTitle || `🔥 ${filename.split('.')[0].toUpperCase()} - Official Clip`,
          summaryAnalysis: parsed.summaryAnalysis || 'Extracted video content highlights key features for maximum social engagement.',
          hashtags: parsed.hashtags || '#SuperGrok #ViralVideo #Trending'
        };

      } catch (err) {
        const errorDetail = err.response?.data?.error?.message || err.response?.data?.error || err.message;
        console.warn(`[Grok API Warning] Model ${modelName} failed:`, errorDetail);
        lastError = errorDetail;
      }
    }

    // If all Grok model attempts failed, return the exact API error instead of hiding it!
    return {
      success: false,
      error: `Lỗi kết nối xAI Grok API: ${lastError || 'Không thể kết nối đến máy chủ xAI'}. Vui lòng kiểm tra lại Grok API Key của bạn.`
    };
  }

  // ================= 2. MODEL: ChatGPT (OpenAI) ================= //
  if (model === 'chatgpt') {
    if (!openaiApiKey) {
      return {
        success: false,
        error: 'Chưa cấu hình OpenAI API Key! Vui lòng dán mã sk-... Key vào ô cài đặt.'
      };
    }

    try {
      console.log('[ChatGPT API] Requesting video analysis completion with gpt-4o-mini...');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are ChatGPT Video Intelligence. Analyze video context and generate: 1) English Title, 2) English short summary analysis, 3) Hashtags. Output ONLY raw valid JSON (no markdown): {"englishTitle": "...", "summaryAnalysis": "...", "hashtags": "#ChatGPT #Video"}'
          },
          {
            role: 'user',
            content: `Video file: ${filename}\nVideo URL: ${publicUrl}\nContext: ${videoPrompt || 'Analyze video'}`
          }
        ],
        temperature: 0.5
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      });

      const contentText = response.data.choices[0]?.message?.content;
      console.log('[ChatGPT API Success] Raw response:', contentText);

      const parsed = JSON.parse(contentText.replace(/```json|```/g, '').trim());

      return {
        success: true,
        source: 'ChatGPT (OpenAI gpt-4o-mini)',
        englishTitle: parsed.englishTitle || 'Featured Video Highlight',
        summaryAnalysis: parsed.summaryAnalysis || 'The video presents engaging visual highlights optimized for viewer interaction.',
        hashtags: parsed.hashtags || '#ChatGPT #SocialMedia #Viral'
      };
    } catch (err) {
      const errorDetail = err.response?.data?.error?.message || err.message;
      console.error('[ChatGPT API Error]:', errorDetail);
      return {
        success: false,
        error: `Lỗi kết nối OpenAI ChatGPT API: ${errorDetail}`
      };
    }
  }

  return {
    success: false,
    error: 'Vui lòng lựa chọn model AI hợp lệ (Super Grok hoặc ChatGPT).'
  };
}

/**
 * Generate AI Customer Service Reply Suggestion for a Comment
 */
export async function suggestAiCommentReply(customerComment, postTopic = '') {
  const settings = db.getSettings();
  const grokApiKey = (settings.grokApiKey || process.env.GROK_API_KEY || '').trim();
  const openaiApiKey = (settings.openaiApiKey || process.env.OPENAI_API_KEY || '').trim();

  if (grokApiKey) {
    try {
      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên viên chăm sóc khách hàng Super Grok. Hãy tạo 1 câu trả lời bình luận ngắn gọn, lịch sự, thân thiện và mời khách hàng kiểm tra Inbox.'
          },
          {
            role: 'user',
            content: `Khách hàng bình luận: "${customerComment}"\nChủ đề: "${postTopic}"`
          }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${grokApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const text = response.data.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) { }
  }

  if (openaiApiKey) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên viên chăm sóc khách hàng tư vấn bán hàng trên Fanpage Facebook. Hãy tạo 1 câu trả lời bình luận ngắn gọn, lịch sự, thân thiện và mời khách hàng kiểm tra hộp thư tin nhắn (Inbox).'
          },
          {
            role: 'user',
            content: `Khách hàng bình luận: "${customerComment}"\nChủ đề bài đăng: "${postTopic}"`
          }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const text = response.data.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) { }
  }

  return `Dạ chào bạn! Shop đã gửi thông tin chi tiết và ưu đãi dành riêng cho bạn vào hộp thư tin nhắn rồi ạ. Bạn kiểm tra giúp shop nhé!`;
}
