import React, { useState } from 'react';

export default function AiContentGenerator({ accounts, onSendToPublisher }) {
  const [userPrompt, setUserPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) {
      setNotice({ type: 'error', text: 'Vui lòng nhập Yêu Cầu Prompt của bạn cho ChatGPT!' });
      return;
    }

    setGenerating(true);
    setNotice(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt.trim(),
          imagePrompt: imagePrompt.trim()
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        setGeneratedData(data.data);
        if (data.apiErrorNotice) {
          setNotice({ 
            type: 'error', 
            text: `Lưu ý OpenAI Key: ${data.apiErrorNotice} (Hệ thống đã dùng AI dự phòng để bài viết vẫn tạo thành công).` 
          });
        } else {
          setNotice({ 
            type: 'success', 
            text: `Đã sinh xong nội dung từ ${data.source}! Hãy kiểm tra bên dưới.` 
          });
        }
      } else {
        throw new Error(data.error || 'Không thể tạo nội dung.');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleTransferToPost = () => {
    if (!generatedData) return;
    onSendToPublisher({
      title: generatedData.title || '',
      caption: generatedData.caption || '',
      hashtags: generatedData.hashtags || '',
      firstComment: generatedData.firstComment || '',
      mediaUrls: generatedData.mediaUrl ? [generatedData.mediaUrl] : []
    });
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* LEFT: Custom Prompt Input */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px' }}>
          Tạo Content Bằng ChatGPT
        </h2>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Nhập trực tiếp câu lệnh Prompt của bạn cho ChatGPT. Hệ thống sẽ sinh bài viết và cho phép bạn chuyển thẳng sang form đăng bài để kiểm tra trước khi đăng.
        </p>

        {notice && (
          <div className={`alert alert-${notice.type}`} style={{ marginBottom: '14px', fontSize: '0.85rem', padding: '10px 14px' }}>
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleGenerate}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Câu Lệnh Prompt Nội Dung (*)</label>
            <textarea 
              className="input-field" 
              rows={5}
              placeholder="VD: Viết bài đăng Facebook giới thiệu dòng son môi mới, tặng voucher 20%..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Câu Lệnh Prompt Hình Ảnh (Tùy chọn)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="VD: Luxury red lipstick banner poster design..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}
            disabled={generating}
          >
            {generating ? 'Đang Chạy ChatGPT...' : 'Sinh Nội Dung Bằng ChatGPT'}
          </button>
        </form>
      </div>

      {/* RIGHT: Generated Output Preview & Transfer Action */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
          Kết Quả ChatGPT Đã Tạo
        </h3>

        {!generatedData ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nhập câu lệnh Prompt bên trái và bấm <strong>"Sinh Nội Dung Bằng ChatGPT"</strong>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Action button to populate PostPublisher */}
            <button 
              type="button"
              className="btn btn-primary"
              style={{
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 600,
                width: '100%'
              }}
              onClick={handleTransferToPost}
            >
              Đưa Vào Bài Đăng Ngay Để Xem Lại
            </button>

            <div className="form-group">
              <label className="form-label">Tiêu Đề Bài Viết</label>
              <input 
                type="text" 
                className="input-field" 
                value={generatedData.title || ''} 
                onChange={(e) => setGeneratedData({ ...generatedData, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nội Dung Bài Đăng (Caption)</label>
              <textarea 
                className="input-field" 
                rows={6}
                value={generatedData.caption || ''} 
                onChange={(e) => setGeneratedData({ ...generatedData, caption: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Hashtags</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={generatedData.hashtags || ''} 
                  onChange={(e) => setGeneratedData({ ...generatedData, hashtags: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">First Comment</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={generatedData.firstComment || ''} 
                  onChange={(e) => setGeneratedData({ ...generatedData, firstComment: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
