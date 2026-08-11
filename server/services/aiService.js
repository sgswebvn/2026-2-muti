import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { fixUtf8Encoding, cleanTitleText } from '../utils/fontSanitizer.js';

/**
 * List of valid Gemini models to attempt in order of performance
 */
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash'
];

/**
 * Helper to call Gemini API with model fallback support
 */
async function callGeminiApi(apiKey, contents, timeoutMs = 60000) {
  let lastError = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[Gemini API] Sending request using model: "${modelName}"...`);
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        { contents },
        { headers: { 'Content-Type': 'application/json' }, timeout: timeoutMs }
      );
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, modelUsed: modelName, data: response.data };
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`[Gemini API Warning] Model "${modelName}" failed:`, msg);
      lastError = msg;
    }
  }
  throw new Error(`Tất cả các AI Models Gemini đều không thể xử lý: ${lastError}`);
}

/**
 * Determine MimeType based on file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4': return 'video/mp4';
    case '.mov': return 'video/quicktime';
    case '.webm': return 'video/webm';
    case '.avi': return 'video/x-msvideo';
    case '.mkv': return 'video/x-matroska';
    case '.3gp': return 'video/3gpp';
    default: return 'video/mp4';
  }
}

/**
 * Resolve relative mediaUrl (/uploads/media_123.mp4) or raw filename to absolute path on disk
 */
function getLocalFilePath(mediaUrlOrName) {
  if (!mediaUrlOrName) return null;

  let filename = mediaUrlOrName;
  if (mediaUrlOrName.includes('/uploads/')) {
    filename = mediaUrlOrName.split('/uploads/').pop();
  } else if (mediaUrlOrName.includes('\\uploads\\')) {
    filename = mediaUrlOrName.split('\\uploads\\').pop();
  }
  filename = path.basename(filename);

  const filePath = path.resolve('uploads', filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * Upload large video to Gemini Files API (/upload/v1beta/files)
 */
async function uploadVideoToGemini(filePath, mimeType, apiKey) {
  try {
    const fileSize = fs.statSync(filePath).size;
    console.log(`[Gemini File API] Uploading ${path.basename(filePath)} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

    // Step 1: Initiate Resumable Upload
    const initRes = await axios.post(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      { file: { display_name: path.basename(filePath) } },
      {
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json'
        }
      }
    );

    const uploadUrl = initRes.headers['x-goog-upload-url'];
    if (!uploadUrl) {
      throw new Error('Could not obtain upload URL from Gemini API');
    }

    // Step 2: Upload File Bytes
    const fileStream = fs.readFileSync(filePath);
    const uploadRes = await axios.post(uploadUrl, fileStream, {
      headers: {
        'Content-Length': fileSize.toString(),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    let fileInfo = uploadRes.data?.file;
    if (!fileInfo || !fileInfo.name) {
      throw new Error('Failed to retrieve file reference from Gemini Upload API');
    }

    console.log(`[Gemini File API] File uploaded successfully: ${fileInfo.name}. State: ${fileInfo.state}`);

    // Step 3: Poll if file state is PROCESSING
    let retries = 0;
    while (fileInfo.state === 'PROCESSING' && retries < 15) {
      await new Promise(r => setTimeout(r, 2000));
      retries++;
      const pollRes = await axios.get(
        `https://generativelanguage.googleapis.com/v1beta/${fileInfo.name}?key=${apiKey}`
      );
      fileInfo = pollRes.data;
      console.log(`[Gemini File API] Processing status check ${retries}: ${fileInfo.state}`);
    }

    if (fileInfo.state !== 'ACTIVE') {
      throw new Error(`Gemini File processing did not complete. State: ${fileInfo.state}`);
    }

    return {
      fileData: {
        mimeType: mimeType,
        fileUri: fileInfo.uri
      }
    };
  } catch (err) {
    console.warn('[Gemini File API Warning]:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Prepare Gemini Multimodal Video Part (inlineData base64 for <20MB or File API for >=20MB)
 */
async function prepareVideoPart(mediaUrlOrName, apiKey) {
  const filePath = getLocalFilePath(mediaUrlOrName);
  if (!filePath) {
    console.warn(`[AI Service] Local video file not found for: "${mediaUrlOrName}".`);
    return null;
  }

  const mimeType = getMimeType(filePath);
  const fileSize = fs.statSync(filePath).size;
  const sizeInMb = fileSize / (1024 * 1024);

  console.log(`[AI Service] Preparing video media (${sizeInMb.toFixed(2)} MB) for Gemini multimodal analysis...`);

  if (sizeInMb <= 20) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      return {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };
    } catch (e) {
      console.warn('[AI Service Base64 Error]:', e.message);
    }
  }

  return await uploadVideoToGemini(filePath, mimeType, apiKey);
}

export async function generateAiContent(options = {}) {
  return analyzeVideoContent(options);
}

/**
 * Deep Multimodal Video Content Analysis via Google Gemini (2.5/3.6 Flash)
 */
export async function analyzeVideoContent(options = {}) {
  const { videoUrl = '', originalName = '', videoPrompt = '' } = options;
  const settings = db.getSettings();
  const geminiApiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const rawTarget = videoUrl || originalName || '';

  if (!geminiApiKey) {
    return {
      success: false,
      error: 'Vui lòng dán Gemini API Key trong phần Cấu Hình API Keys trước khi phân tích video.'
    };
  }

  try {
    // 1. Prepare actual Multimodal Video Part (visuals & audio)
    const videoPart = await prepareVideoPart(rawTarget, geminiApiKey);

    // 2. Build detailed prompt for deep video scene, audio, actor & theme analysis
    const promptText = `You are a master video curator, entertainment archivist, and viral content strategist.

CRITICAL REQUIREMENT:
Perform a DEEP, COMPREHENSIVE VISUAL AND AUDIO ANALYSIS of the provided video file:
1. Identify the exact show/clip name, actors/people involved, comedy sketch or scene setting, actions, dialogue/punchline, and emotional reactions (e.g. ad-libbing, breaking character, funny moments, high-impact action).
2. DO NOT use generic template text or fallback titles! Every detail MUST come directly from your analysis of what happens in the video.

Tasks:
1. "englishTitle": Create a punchy, highly specific, authentic English title/headline describing the exact clip content (e.g. "TIM CONWAY'S ELEPHANT STORY THAT BROKE THE CAST | THE CAROL BURNETT SHOW" or specific action headline).
2. "summaryAnalysis": Write a rich, engaging 3-4 sentence English post caption describing the exact actors/people, the scene context, what happens (the hilarious ad-lib or key visual highlight), and why it's legendary or worth watching.
3. "hashtags": 4-6 specific hashtags based on the actual identified subject, actors, or theme.

User Prompt Context: "${videoPrompt || 'Deeply analyze this video clip and create an authentic post'}".

Return raw JSON ONLY:
{"englishTitle": "...", "summaryAnalysis": "...", "hashtags": "..."}`;

    const parts = [];
    if (videoPart) {
      parts.push(videoPart);
    }
    parts.push({ text: promptText });

    console.log(`[AI Service] Sending deep multimodal video analysis request... (Has Video Part: ${!!videoPart})`);

    const result = await callGeminiApi(geminiApiKey, [{ parts }], 90000);

    const contentText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonStr = contentText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    if (parsed.summaryAnalysis) {
      const titleClean = cleanTitleText(parsed.englishTitle || 'EXPLORING THE VIDEO SHOWCASE');
      const captionClean = fixUtf8Encoding(parsed.summaryAnalysis);
      const hashtagsClean = fixUtf8Encoding(parsed.hashtags || '#VideoAnalysis #ViralClip');

      return {
        success: true,
        source: `Google Gemini Multimodal AI (${result.modelUsed})`,
        englishTitle: titleClean,
        summaryAnalysis: captionClean,
        hashtags: hashtagsClean
      };
    }
  } catch (err) {
    console.error('[Gemini Video Analysis Error]:', err.message);
    return {
      success: false,
      error: `Lỗi phân tích video: ${err.message}`
    };
  }

  return {
    success: false,
    error: 'Không nhận được kết quả phân tích hợp lệ từ Gemini API.'
  };
}

/**
 * Generate 15+ Unique Fanpage Variations from Multimodal Video Analysis
 */
export async function generateMultiPageVariations(options = {}) {
  const { videoUrl = '', originalName = '', videoPrompt = '', pageAccounts = [] } = options;
  if (!Array.isArray(pageAccounts) || pageAccounts.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 Fanpage để sinh biến thể nội dung.' };
  }

  const settings = db.getSettings();
  const geminiApiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const rawTarget = videoUrl || originalName || '';

  if (!geminiApiKey) {
    return { success: false, error: 'Vui lòng dán Gemini API Key trước khi sinh biến thể.' };
  }

  try {
    const videoPart = await prepareVideoPart(rawTarget, geminiApiKey);
    const pageListDesc = pageAccounts.map(p => `Page ID "${p.id}" (${p.name})`).join('\n');

    const promptText = `You are a master social media content creator.
CRITICAL REQUIREMENT: Analyze the actual visual scenes, dialogue, actors, and action in the attached video clip.
Write ${pageAccounts.length} COMPLETELY DISTINCT, authentic English Facebook post captions AND 100% UNIQUE DISTINCT TITLES for ${pageAccounts.length} different Facebook pages based on your real video analysis.

RULES:
1. EVERY SINGLE TITLE AND CAPTION MUST BE GROUNDED IN THE REAL VIDEO ANALYSIS (actors, scene, joke, visual action).
2. EVERY PAGE MUST HAVE A 100% UNIQUE TITLE AND CAPTION. No two pages can share the same title or caption!
3. Keep titles punchy, clean English headlines without boilerplate noise or ugly double dashes.
4. Keep captions concise (2-3 impact sentences) directly related to the specific details of the video clip.

Pages to generate for:
${pageListDesc}

User prompt: "${videoPrompt || 'Create authentic post variations'}"

Return ONLY raw JSON object:
{
  "variations": {
    "PAGE_ID": {
      "title": "Unique Punchy English Title",
      "caption": "Authentic post caption describing the real video content",
      "hashtags": "#Hashtag1 #Hashtag2",
      "firstComment": "Natural engagement comment"
    }
  }
}`;

    const parts = [];
    if (videoPart) {
      parts.push(videoPart);
    }
    parts.push({ text: promptText });

    console.log(`[AI Variations] Generating ${pageAccounts.length} multimodal video variations with Gemini...`);

    const result = await callGeminiApi(geminiApiKey, [{ parts }], 120000);

    const contentText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonStr = contentText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    if (parsed.variations && Object.keys(parsed.variations).length > 0) {
      const cleanedVariations = {};
      for (const [pageId, varObj] of Object.entries(parsed.variations)) {
        cleanedVariations[pageId] = {
          title: cleanTitleText(varObj.title || 'EXCLUSIVE VIDEO HIGHLIGHT'),
          caption: fixUtf8Encoding(varObj.caption || ''),
          hashtags: fixUtf8Encoding(varObj.hashtags || '#VideoShowcase'),
          firstComment: fixUtf8Encoding(varObj.firstComment || 'Drop a comment below!')
        };
      }

      return {
        success: true,
        source: `Google Gemini Multimodal AI (${result.modelUsed})`,
        variations: cleanedVariations
      };
    }
  } catch (e) {
    console.error('[Gemini Multimodal Variations Error]:', e.message);
    return { success: false, error: e.message };
  }

  return { success: false, error: 'Không thể khởi tạo biến thể từ Gemini API.' };
}

export async function suggestAiCommentReply(customerComment, postTopic = '') {
  return fixUtf8Encoding('Thank you for reaching out! We have sent you a direct message with full details. Please check your inbox!');
}