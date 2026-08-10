import React, { useState, useEffect } from 'react';
import { Video, Sparkles, Send, Key, Upload, CheckCircle2, AlertCircle, Cpu, Settings } from 'lucide-react';

export default function AiContentGenerator({ accounts, onSendToPublisher, onOpenGuide }) {
  // Model Choice: 'grok' (Super Grok 4.5) | 'chatgpt' (ChatGPT OpenAI)
  const [selectedModel, setSelectedModel] = useState('grok');

  // Keys
  const [grokApiKey, setGrokApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Notice
  const [notice, setNotice] = useState(null);

  // Video Analysis state
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [videoAnalysisResult, setVideoAnalysisResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.grokApiKey) setGrokApiKey(data.settings.grokApiKey);
        if (data.settings.openaiApiKey) setOpenaiApiKey(data.settings.openaiApiKey);
      }
    } catch (e) {}
  };

  const handleSaveApiKeys = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grokApiKey: grokApiKey.trim(),
          openaiApiKey: openaiApiKey.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', text: 'Đã lưu cấu hình API Keys (Grok 4.5 & ChatGPT) thành công!' });
        setShowKeyInput(false);
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  };

  const handleVideoUploadAndAnalyze = async (file) => {
    if (!file) return;

    setVideoFile(file);
    setAnalyzingVideo(true);
    setNotice(null);

    try {
      // 1. Upload video file to server
      const formData = new FormData();
      formData.append('media', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success || !uploadData.fileUrl) {
        throw new Error(uploadData.error || 'Tải tệp video lên máy chủ thất bại.');
      }

      const uploadedUrl = uploadData.fileUrl;
      setVideoUrl(uploadedUrl);

      // 2. Call AI Video Analysis API with chosen model
      const analyzeRes = await fetch('/api/ai/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: uploadedUrl,
          model: selectedModel,
          videoPrompt: `Phân tích video "${file.name}" và tạo tiêu đề tiếng Anh cuốn hút`
        })
      });

      const analyzeData = await analyzeRes.json();
      if (analyzeData.success) {
        setVideoAnalysisResult({
          englishTitle: analyzeData.englishTitle,
          summaryAnalysis: analyzeData.summaryAnalysis,
          hashtags: analyzeData.hashtags || '#ViralVideo #Trending',
          videoUrl: uploadedUrl,
          source: analyzeData.source,
          modelUsed: selectedModel
        });
        setNotice({
          type: 'success',
          text: `Đã phân tích xong video bằng model [${selectedModel === 'grok' ? 'Super Grok 4.5' : 'ChatGPT'}]!`
        });
      } else {
        throw new Error(analyzeData.error || 'Lỗi phân tích video.');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setAnalyzingVideo(false);
    }
  };

  const handleTransferVideoToPost = () => {
    if (!videoAnalysisResult) return;
    onSendToPublisher({
      title: videoAnalysisResult.englishTitle || '',
      caption: `${videoAnalysisResult.summaryAnalysis}`,
      hashtags: videoAnalysisResult.hashtags || '#ViralVideo #Trending',
      firstComment: '👉 Check out this video and leave a reply below!',
      mediaUrls: videoAnalysisResult.videoUrl ? [videoAnalysisResult.videoUrl] : []
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER BANNER & MODEL SELECTOR */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video color="#38bdf8" size={24} /> Phân Tích Video Bằng AI & Đăng Bài Facebook Tự Động
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Chỉ cần upload video của bạn, AI sẽ tự động phân tích nội dung, trích xuất <strong>Tiêu Đề Tiếng Anh (English Title)</strong> và tạo bài viết để đăng ngay lên Facebook Fanpage.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onOpenGuide && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={onOpenGuide}
              >
                📖 Hướng Dẫn Lấy API Keys
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              onClick={() => setShowKeyInput(!showKeyInput)}
            >
              <Settings size={14} /> {showKeyInput ? 'Đóng Cấu Hình' : 'Cấu Hình API Keys'}
            </button>
          </div>
        </div>

        {/* SELECT AI MODEL (GROK 4.5 vs CHATGPT) */}
        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
          <label className="form-label" style={{ marginBottom: '8px', fontSize: '0.875rem' }}>
            Chọn AI Model Phân Tích Video:
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* GROK 4.5 OPTION */}
            <div
              onClick={() => setSelectedModel('grok')}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: selectedModel === 'grok' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                border: selectedModel === 'grok' ? '2px solid #a855f7' : '1px solid #334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input 
                type="radio" 
                name="aiModelChoice" 
                checked={selectedModel === 'grok'} 
                onChange={() => setSelectedModel('grok')} 
              />
              <div>
                <div style={{ fontWeight: 700, color: selectedModel === 'grok' ? '#e9d5ff' : 'var(--text-main)', fontSize: '0.925rem' }}>
                  ⚡ Model 1: Super Grok (xAI Grok-4.5)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Phân tích video chuyên sâu bằng xAI Grok-4.5 Vision
                </div>
              </div>
            </div>

            {/* CHATGPT OPTION */}
            <div
              onClick={() => setSelectedModel('chatgpt')}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: selectedModel === 'chatgpt' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                border: selectedModel === 'chatgpt' ? '2px solid #3b82f6' : '1px solid #334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input 
                type="radio" 
                name="aiModelChoice" 
                checked={selectedModel === 'chatgpt'} 
                onChange={() => setSelectedModel('chatgpt')} 
              />
              <div>
                <div style={{ fontWeight: 700, color: selectedModel === 'chatgpt' ? '#93c5fd' : 'var(--text-main)', fontSize: '0.925rem' }}>
                  🤖 Model 2: ChatGPT (OpenAI GPT-4o)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Trích xuất tiêu đề & nội dung video bằng OpenAI GPT-4o
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API KEYS CONFIGURATION PANEL */}
      {showKeyInput && (
        <div className="glass-card" style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.95)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#60a5fa' }}>
            Cấu Hình API Keys Cho Cả 2 Models
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Super Grok API Key (xai-...)</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Dán xai-... API Key tại đây" 
                value={grokApiKey} 
                onChange={(e) => setGrokApiKey(e.target.value)} 
              />
            </div>

            <div>
              <label className="form-label">ChatGPT OpenAI API Key (sk-...)</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Dán sk-... API Key tại đây" 
                value={openaiApiKey} 
                onChange={(e) => setOpenaiApiKey(e.target.value)} 
              />
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={handleSaveApiKeys}>
            Lưu Cấu Hình API Keys
          </button>
        </div>
      )}

      {notice && (
        <div className={`alert alert-${notice.type}`} style={{ fontSize: '0.875rem', padding: '12px 16px' }}>
          <span>{notice.text}</span>
        </div>
      )}

      {/* MAIN VIDEO UPLOADER & RESULTS SECTION */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* LEFT: UPLOAD BOX */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#38bdf8" /> 1. Upload Video Phân Tích
          </h3>

          <div style={{ background: '#0f172a', padding: '24px 16px', borderRadius: '12px', border: '2px dashed #475569', textAlign: 'center', marginBottom: '16px' }}>
            <Upload size={42} color="#a855f7" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>
              Tải Tệp Video Của Bạn Lên
            </div>
            <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Định dạng: MP4, MOV, WEBM, AVI (Tối đa 500MB)
            </div>

            <input 
              type="file" 
              accept="video/*" 
              id="main-video-upload-input" 
              style={{ display: 'none' }} 
              onChange={(e) => {
                if (e.target.files?.[0]) handleVideoUploadAndAnalyze(e.target.files[0]);
              }}
            />

            <label 
              htmlFor="main-video-upload-input" 
              className="btn btn-primary" 
              style={{ 
                cursor: 'pointer', 
                background: selectedModel === 'grok' ? '#9333ea' : '#2563eb', 
                border: 'none',
                padding: '12px 20px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              {analyzingVideo 
                ? `⏳ ${selectedModel === 'grok' ? 'Grok 4.5' : 'ChatGPT'} Đang Phân Tích Video...` 
                : `📹 Chọn Video & Phân Tích Bằng ${selectedModel === 'grok' ? 'Grok 4.5' : 'ChatGPT'}`}
            </label>

            {videoFile && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>
                📁 Tệp video đang chọn: {videoFile.name}
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
            💡 <b>Quy trình tự động:</b> Sau khi phân tích xong, Tiêu Đề Tiếng Anh (English Title) và nội dung tóm tắt sẽ tự động sẵn sàng bên phải để bạn chuyển sang đăng bài Facebook ngay!
          </div>
        </div>

        {/* RIGHT: AI ANALYSIS OUTPUT PREVIEW */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: '#38bdf8' }}>
            2. Kết Quả Nội Dung Video Đã Trích Xuất
          </h3>

          {!videoAnalysisResult ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Hãy bấm <strong>"Chọn Video & Phân Tích"</strong> bên trái để AI tự động tạo Tiêu Đề Tiếng Anh và Nội Dung Bài Đăng.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Model đã dùng:</span>
                <span style={{ color: '#c084fc', fontWeight: 700 }}>{videoAnalysisResult.source}</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>English Title (Tiêu Đề Bài Viết Tiếng Anh):</label>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ fontWeight: 700, color: '#38bdf8' }}
                  value={videoAnalysisResult.englishTitle} 
                  onChange={(e) => setVideoAnalysisResult({ ...videoAnalysisResult, englishTitle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nội Dung Tóm Tắt Video (English Caption):</label>
                <textarea 
                  className="input-field" 
                  rows={4} 
                  value={videoAnalysisResult.summaryAnalysis} 
                  onChange={(e) => setVideoAnalysisResult({ ...videoAnalysisResult, summaryAnalysis: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hashtags Gợi Ý:</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={videoAnalysisResult.hashtags} 
                  onChange={(e) => setVideoAnalysisResult({ ...videoAnalysisResult, hashtags: e.target.value })}
                />
              </div>

              {/* ACTION BUTTON TO TRANSFER TO POST PUBLISHER */}
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: 700,
                  background: '#16a34a',
                  border: 'none',
                  marginTop: '8px'
                }}
                onClick={handleTransferVideoToPost}
              >
                🚀 Đưa Video & Tiêu Đề Này Sang Form Đăng Facebook Ngay
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
