import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { fixUtf8Encoding, cleanTitleText } from '../utils/fontSanitizer.js';

/**
 * List of official, valid Gemini models to attempt in order of speed and quota availability
 */
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest'
];

/**
 * Robust JSON Extractor from raw AI responses
 */
function extractJsonFromText(text) {
  if (!text) return null;
  try {
    const cleanStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanStr);
  } catch (e) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonSub = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSub);
      } catch (err2) {}
    }
    return null;
  }
}

/**
 * Helper to call Gemini API with automatic model fallback & 429 quota handling
 */
async function callGeminiApi(apiKey, contents, timeoutMs = 60000) {
  let lastError = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[Gemini API] Trying model: "${modelName}"...`);
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        { contents },
        { headers: { 'Content-Type': 'application/json' }, timeout: timeoutMs }
      );
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`[Gemini API Success] Model "${modelName}" responded successfully.`);
        return { success: true, modelUsed: modelName, data: response.data };
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`[Gemini API Notice] Model "${modelName}" failed (Status: ${status}): ${msg}`);
      lastError = `[${modelName}]: ${msg}`;
    }
  }
  throw new Error(`Tất cả AI Models của Gemini đều bận hoặc hết Quota: ${lastError}`);
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
 * Deep Multimodal Video Content Analysis via Google Gemini
 */
export async function analyzeVideoContent(options = {}) {
  const { videoUrl = '', originalName = '', videoPrompt = '' } = options;
  const settings = db.getSettings ? (await db.getSettings()) : {};
  const geminiApiKey = (options.geminiApiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const rawTarget = videoUrl || originalName || '';

  if (!geminiApiKey) {
    return {
      success: false,
      error: 'Vui lòng dán Gemini API Key trong phần Cấu Hình API Keys trước khi phân tích video.'
    };
  }

  try {
    const videoPart = await prepareVideoPart(rawTarget, geminiApiKey);

    const promptText = `You are a master video curator, entertainment archivist, and viral content strategist.

CRITICAL REQUIREMENT:
Perform a DEEP, COMPREHENSIVE VISUAL AND AUDIO ANALYSIS of the provided video file:
1. Identify the exact show/clip name, actors/people involved, comedy sketch or scene setting, actions, dialogue/punchline, and emotional reactions.
2. DO NOT use generic template text or fallback titles! Every detail MUST come directly from your analysis of what happens in the video.

Tasks:
1. "englishTitle": Create a punchy, highly specific, authentic English title/headline describing the exact clip content.
2. "summaryAnalysis": Write a rich, engaging 3-4 sentence English post caption describing the exact actors/people, the scene context, what happens, and why it's worth watching.
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
    const parsed = extractJsonFromText(contentText);

    if (parsed && (parsed.summaryAnalysis || parsed.englishTitle)) {
      const titleClean = cleanTitleText(parsed.englishTitle || 'EXPLORING THE VIDEO SHOWCASE');
      const captionClean = fixUtf8Encoding(parsed.summaryAnalysis || parsed.englishTitle || '');
      const rawHashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : String(parsed.hashtags || '#VideoAnalysis #ViralClip');
      const hashtagsClean = fixUtf8Encoding(rawHashtags);

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
 * Generate 15+ Unique Fanpage Variations with Automatic Quota Fallback
 */
export async function generateMultiPageVariations(options = {}) {
  const { videoUrl = '', originalName = '', videoPrompt = '', videoTopic = '', pageAccounts = [] } = options;
  if (!Array.isArray(pageAccounts) || pageAccounts.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 Fanpage để sinh biến thể nội dung.' };
  }

  const settings = db.getSettings ? (await db.getSettings()) : {};
  const geminiApiKey = (options.geminiApiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const rawTarget = videoUrl || originalName || '';

  if (!geminiApiKey) {
    // If no API Key, return smart local fallback variations
    const fallbackVariations = generateLocalFallbackVariations(pageAccounts, videoTopic, videoPrompt);
    return {
      success: true,
      source: 'Smart Dynamic Content Engine (Cần dán Gemini API Key)',
      variations: fallbackVariations
    };
  }

  try {
    const videoPart = await prepareVideoPart(rawTarget, geminiApiKey);
    const pageListDesc = pageAccounts.map(p => `Page ID "${p.id}" (${p.name})`).join('\n');

    const promptText = `You are a master social media content creator.
CRITICAL REQUIREMENT: Analyze the actual visual scenes, dialogue, actors, and action in the attached video clip.
Write ${pageAccounts.length} COMPLETELY DISTINCT, authentic English Facebook post captions AND 100% UNIQUE DISTINCT TITLES for ${pageAccounts.length} different Facebook pages based on your real video analysis.

RULES:
1. EVERY SINGLE TITLE AND CAPTION MUST BE GROUNDED IN THE REAL VIDEO ANALYSIS.
2. EVERY PAGE MUST HAVE A 100% UNIQUE TITLE AND CAPTION.
3. Keep titles punchy, clean English headlines.
4. Keep captions concise (2-3 impact sentences).

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
    const parsed = extractJsonFromText(contentText);

    if (parsed && parsed.variations && Object.keys(parsed.variations).length > 0) {
      const cleanedVariations = {};
      for (const [pageId, varObj] of Object.entries(parsed.variations)) {
        const rawHashtags = Array.isArray(varObj.hashtags) ? varObj.hashtags.join(' ') : String(varObj.hashtags || '#VideoShowcase');
        cleanedVariations[pageId] = {
          title: cleanTitleText(varObj.title || 'EXCLUSIVE VIDEO HIGHLIGHT'),
          caption: fixUtf8Encoding(varObj.caption || ''),
          hashtags: fixUtf8Encoding(rawHashtags),
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
    console.warn('[Gemini Multimodal Variations Warning]:', e.message);
    // If Quota Exceeded or API error, seamlessly fallback to local dynamic variation engine so user is never blocked!
    const fallbackVariations = generateLocalFallbackVariations(pageAccounts, videoTopic, videoPrompt);
    return {
      success: true,
      source: 'Smart Dynamic Content Engine (Gemini Quota Exceeded Fallback)',
      variations: fallbackVariations
    };
  }

  const fallbackVariations = generateLocalFallbackVariations(pageAccounts, videoTopic, videoPrompt);
  return {
    success: true,
    source: 'Smart Dynamic Content Engine (Default Fallback)',
    variations: fallbackVariations
  };
}

/**
 * Smart Fallback Engine when Gemini API is out of Quota or Offline
 */
export function generateLocalFallbackVariations(pageAccounts, videoTopic = '', videoPrompt = '') {
  const baseTitle = videoTopic || 'EXCLUSIVE VIDEO SHOWCASE';
  const variations = {};
  
  const hooks = [
    'Check out this incredible video clip!',
    'Unbelievable highlight captured on camera!',
    'Must-watch video highlight of the day!',
    'Full breakdown of this amazing viral moment!',
    'Watch what happens in this exclusive clip!',
    'Top trending highlight you cannot miss!',
    'Behind the scenes action revealed in full!'
  ];

  const comments = [
    '👉 What do you think about this clip? Drop a comment below!',
    '👉 Share your thoughts in the comments!',
    '👉 Tag a friend who needs to see this video!',
    '👉 Drop a 🔥 if you enjoyed this highlight!'
  ];

  pageAccounts.forEach((page, idx) => {
    const hook = hooks[idx % hooks.length];
    const comment = comments[idx % comments.length];
    variations[page.id] = {
      title: cleanTitleText(`${baseTitle} - ${page.name}`),
      caption: fixUtf8Encoding(`${hook}\n\n${videoPrompt || baseTitle}`),
      hashtags: '#ViralVideo #Trending #VideoHighlight',
      firstComment: fixUtf8Encoding(comment)
    };
  });

  return variations;
}

export async function suggestAiCommentReply(customerComment, postTopic = '') {
  return fixUtf8Encoding('Thank you for reaching out! We have sent you a direct message with full details. Please check your inbox!');
}