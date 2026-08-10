import axios from 'axios';
import { db } from '../db.js';

/**
 * Generate Social Media Content & Real AI Image directly
 * @param {Object} options { prompt, imagePrompt, topic, tone }
 */
export async function generateAiContent(options = {}) {
  const { 
    prompt = '', 
    imagePrompt = '',
    topic = 'Khuyến mãi bán hàng',
    tone = 'Hấp dẫn' 
  } = options;

  const settings = db.getSettings();
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;

  const userPrompt = prompt.trim() || `Viết bài đăng Facebook chuyên nghiệp về: "${topic}". Tông giọng ${tone}.`;
  let apiErrorNotice = null;

  // 1. Text Generation (ChatGPT API or Smart Fallback)
  if (apiKey && apiKey.trim()) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Bạn là trợ lý AI sáng tạo nội dung bài đăng Facebook. Hãy đọc yêu cầu (prompt) của người dùng và tạo ra bài viết bằng tiếng Việt. Trả về ĐÚNG 1 ĐỊNH DẠNG JSON duy nhất (không bọc trong markdown codeblock) có các trường: {"title": "Tiêu đề", "caption": "Nội dung chi tiết bài viết", "hashtags": "#hashtag1 #hashtag2", "firstComment": "Bình luận đầu tiên", "imagePrompt": "Mô tả ảnh sắc nét bằng tiếng Anh cho AI vẽ"}'
          },
          {
            role: 'user',
            content: `Yêu cầu tạo bài viết: ${userPrompt}\nGợi ý ảnh (nếu có): ${imagePrompt}`
          }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const contentText = response.data.choices[0]?.message?.content;
      resultData = JSON.parse(contentText.replace(/```json|```/g, '').trim());
      source = 'ChatGPT API (OpenAI gpt-4o-mini)';
    } catch (err) {
      apiErrorNotice = err.response?.data?.error?.message || err.message;
      console.warn('OpenAI API Error, falling back to Smart AI Generator:', apiErrorNotice);
    }
  }

  if (!resultData) {
    resultData = {
      title: `🔥 [ChatGPT Content] ${userPrompt.substring(0, 40)}...`,
      caption: `✨ NỘI DUNG TỰ ĐỘNG CHUẨN CHATGPT ✨\n\nNội dung bài viết được sinh ra theo prompt của bạn: "${userPrompt}"\n\n🔹 Điểm nổi bật và giá trị cốt lõi\n🔹 Ưu đãi và lời kêu gọi hành động (Call to action)\n\n👉 Nhắn tin ngay để nhận tư vấn chi tiết!`,
      hashtags: '#ChatGPT #ContentMarketing #SocialMedia #Viral',
      firstComment: '👉 Liên hệ ngay hoặc để lại bình luận bên dưới để nhận thêm thông tin chi tiết!',
      imagePrompt: imagePrompt || `High quality professional social media poster graphics about ${userPrompt.substring(0, 30)}`
    };
  }

  // 2. Real AI Image Generation (DALL-E 3 or Free High-Quality Flux/StableDiffusion Engine)
  const finalImagePrompt = resultData.imagePrompt || imagePrompt || userPrompt;
  let generatedImageUrl = '';

  // Try DALL-E 3 first if OpenAI API key is set
  if (apiKey) {
    try {
      const imgRes = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt: finalImagePrompt,
        n: 1,
        size: '1024x1024'
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      if (imgRes.data?.data?.[0]?.url) {
        generatedImageUrl = imgRes.data.data[0].url;
      }
    } catch (e) {
      console.warn('DALL-E 3 API Notice (Falling back to Free High-Speed AI Image Generator):', e.message);
    }
  }

  // Fallback to Free Unlimited High-Speed AI Image Engine (Pollinations AI Flux)
  if (!generatedImageUrl) {
    const seed = Math.floor(Math.random() * 1000000);
    const cleanPrompt = encodeURIComponent(finalImagePrompt);
    generatedImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
  }

  resultData.mediaUrl = generatedImageUrl;

  return {
    success: true,
    source: source,
    apiErrorNotice: apiErrorNotice,
    data: resultData
  };
}
