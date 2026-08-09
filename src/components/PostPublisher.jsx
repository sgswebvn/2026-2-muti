import React, { useState } from 'react';
import { 
  Upload, Image, Film, Send, Calendar, Facebook, Instagram, AtSign, 
  Sparkles, CheckCircle, AlertCircle, X, Eye, Hash 
} from 'lucide-react';

export default function PostPublisher({ accounts, onPostCreated }) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#reels #trending #viral');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [uploading, setUploading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook', 'instagram', 'threads']);
  const [postMode, setPostMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState('facebook');
  const [notice, setNotice] = useState(null);

  // Handle File Drag & Drop / Upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);

    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setMediaUrl(data.fileUrl);
        setMediaType(data.mediaType);
        setMediaFile(file);
      } else {
        throw new Error(data.error || 'Tải file thất bại');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const togglePlatform = (platform) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleAddPresetHashtag = (tag) => {
    if (!hashtags.includes(tag)) {
      setHashtags(prev => (prev ? `${prev} ${tag}` : tag));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim() && !mediaUrl) {
      setNotice({ type: 'error', text: 'Vui lòng nhập nội dung bài viết hoặc tải lên hình ảnh / video.' });
      return;
    }

    if (selectedPlatforms.length === 0) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ít nhất 1 nền tảng để đăng bài.' });
      return;
    }

    setPublishing(true);
    setNotice(null);

    try {
      const payload = {
        title,
        caption,
        hashtags,
        mediaUrl,
        mediaType,
        platforms: selectedPlatforms,
        scheduledAt: postMode === 'schedule' ? scheduledAt : null,
        publishNow: postMode === 'now'
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Lỗi khi tạo bài viết');

      setNotice({
        type: 'success',
        text: postMode === 'now' 
          ? '🚀 Bài viết đã được gửi lệnh đăng tức thì lên Facebook, Instagram & Threads!'
          : '📅 Bài viết đã được thêm vào lịch trình tự động đăng!'
      });

      // Reset Form
      setTitle('');
      setCaption('');
      setMediaUrl('');
      setMediaFile(null);
      if (onPostCreated) onPostCreated();

    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  const fbCount = accounts.filter(a => a.platform === 'facebook').length;
  const igCount = accounts.filter(a => a.platform === 'instagram').length;
  const thCount = accounts.filter(a => a.platform === 'threads').length;

  return (
    <div className="grid-2">
      {/* LEFT: Multi-Platform Editor Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles color="#e1306c" /> Tạo & Đăng Nội Dung Đồng Thời
        </h2>

        {notice && (
          <div 
            style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '20px', 
              background: notice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${notice.type === 'success' ? '#22c55e' : '#ef4444'}`,
              color: notice.type === 'success' ? '#4ade80' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {notice.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '0.9rem' }}>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Platform Selection */}
          <div className="form-group">
            <label className="form-label">Chọn Nền Tảng Nhận Bài</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div 
                className={`platform-chip facebook ${selectedPlatforms.includes('facebook') ? 'selected' : ''}`}
                onClick={() => togglePlatform('facebook')}
              >
                <Facebook size={16} /> Facebook Page ({fbCount})
              </div>

              <div 
                className={`platform-chip instagram ${selectedPlatforms.includes('instagram') ? 'selected' : ''}`}
                onClick={() => togglePlatform('instagram')}
              >
                <Instagram size={16} /> Instagram Business ({igCount})
              </div>

              <div 
                className={`platform-chip threads ${selectedPlatforms.includes('threads') ? 'selected' : ''}`}
                onClick={() => togglePlatform('threads')}
              >
                <AtSign size={16} /> Threads ({thCount})
              </div>
            </div>
          </div>

          {/* Media Uploader */}
          <div className="form-group">
            <label className="form-label">Media (Hình ảnh / Video Shorts/Reels 9:16)</label>
            {mediaUrl ? (
              <div className="media-preview-box">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} controls autoPlay muted />
                ) : (
                  <img src={mediaUrl} alt="Media Preview" />
                )}
                <button type="button" className="remove-media-btn" onClick={() => setMediaUrl('')}>
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div 
                className="dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('mediaInput').click()}
              >
                <Upload size={32} color="#1877f2" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {uploading ? 'Đang xử lý tải file lên local server...' : 'Kéo thả file vào đây hoặc bấm để chọn'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hỗ trợ MP4, MOV (Reels/Shorts 9:16) & JPG, PNG</span>
                <input 
                  id="mediaInput" 
                  type="file" 
                  accept="image/*,video/*" 
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>
            )}
          </div>

          {/* Title Optional */}
          <div className="form-group">
            <label className="form-label">Tiêu Đề Video (Tùy chọn - Dùng cho Facebook Video/Reel)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ví dụ: Hướng dẫn mẹo hay năm 2026..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Caption */}
          <div className="form-group">
            <label className="form-label">Nội Dung Bài Đăng (Caption)</label>
            <textarea 
              className="textarea-field"
              placeholder="Nhập nội dung mô tả chi tiết bài viết của bạn..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Hashtags */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label"><Hash size={14} /> Hashtags</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#reels', '#viral', '#trending', '#fyp'].map(tag => (
                  <button 
                    key={tag} 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => handleAddPresetHashtag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="#reels #meta #post" 
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* Schedule vs Publish Now Selection */}
          <div className="form-group">
            <label className="form-label">Thời Gian Xuất Bản</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: postMode === 'schedule' ? '12px' : '0' }}>
              <button 
                type="button" 
                className={`btn ${postMode === 'now' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setPostMode('now')}
              >
                <Send size={16} /> Đăng Tức Thì
              </button>

              <button 
                type="button" 
                className={`btn ${postMode === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setPostMode('schedule')}
              >
                <Calendar size={16} /> Lên Lịch Đăng
              </button>
            </div>

            {postMode === 'schedule' && (
              <input 
                type="datetime-local" 
                className="input-field"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required={postMode === 'schedule'}
              />
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '10px' }}
            disabled={publishing}
          >
            {publishing ? '🚀 Đang gửi bài viết đến Facebook, Instagram & Threads...' : (postMode === 'now' ? '🚀 Đăng Ngay Tất Cả Nền Tảng' : '📅 Thêm Vào Lịch Đăng Tự Động')}
          </button>
        </form>
      </div>

      {/* RIGHT: Live Phone Preview Mockup */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={18} color="#1877f2" /> Live Mobile Preview
          </h3>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className={`platform-chip facebook ${previewPlatform === 'facebook' ? 'selected' : ''}`}
              onClick={() => setPreviewPlatform('facebook')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              FB
            </button>
            <button 
              className={`platform-chip instagram ${previewPlatform === 'instagram' ? 'selected' : ''}`}
              onClick={() => setPreviewPlatform('instagram')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              IG
            </button>
            <button 
              className={`platform-chip threads ${previewPlatform === 'threads' ? 'selected' : ''}`}
              onClick={() => setPreviewPlatform('threads')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Threads
            </button>
          </div>
        </div>

        {/* Phone Device Mockup Container */}
        <div className="phone-mockup" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="preview-header">
            <div className="avatar-placeholder">M</div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Tài Khoản {previewPlatform.toUpperCase()}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Vừa xong • 🌐</span>
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', lineHeight: '1.4', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
            {caption || 'Nội dung xem trước bài viết của bạn sẽ hiển thị tại đây...'}
            {hashtags && <div style={{ color: '#60a5fa', marginTop: '6px' }}>{hashtags}</div>}
          </div>

          <div style={{ flex: 1, minHeight: '260px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mediaUrl ? (
              mediaType === 'video' ? (
                <video src={mediaUrl} controls autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={mediaUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                {mediaType === 'video' ? <Film size={36} /> : <Image size={36} />}
                <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Khung hình / Video bài viết</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
