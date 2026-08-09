import React, { useState, useRef } from 'react';
import { 
  Upload, Image, Film, Send, Calendar, Facebook, 
  Sparkles, CheckCircle, AlertCircle, X, Eye, Hash, MessageSquare, CheckSquare, Square,
  Bold, Italic, Type, Smile, Sparkle
} from 'lucide-react';
import { convertToUnicodeFont } from '../utils/unicodeFont';

export default function PostPublisher({ accounts, onPostCreated }) {
  const fbAccounts = accounts.filter(a => a.platform === 'facebook');
  
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#facebook #viral #reels');
  const [firstComment, setFirstComment] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [uploading, setUploading] = useState(false);
  
  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const [postMode, setPostMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState(null);

  const captionRef = useRef(null);

  // Initialize selectedPageIds when fbAccounts change
  React.useEffect(() => {
    if (fbAccounts.length > 0 && selectedPageIds.length === 0) {
      setSelectedPageIds(fbAccounts.map(a => a.id));
    }
  }, [accounts]);

  const togglePageSelection = (pageId) => {
    if (selectedPageIds.includes(pageId)) {
      setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
    } else {
      setSelectedPageIds([...selectedPageIds, pageId]);
    }
  };

  const toggleSelectAllPages = () => {
    if (selectedPageIds.length === fbAccounts.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(fbAccounts.map(a => a.id));
    }
  };

  // Apply Unicode Font Style to selected text in caption textarea
  const applyFontStyle = (style) => {
    const textarea = captionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start === end) {
      alert('Vui lòng bôi đen (chọn) đoạn văn bản cần đổi phông chữ!');
      return;
    }

    const selectedText = caption.substring(start, end);
    const converted = convertToUnicodeFont(selectedText, style);
    const newCaption = caption.substring(0, start) + converted + caption.substring(end);
    
    setCaption(newCaption);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + converted.length);
    }, 50);
  };

  // Insert Emoji at cursor
  const insertEmoji = (emoji) => {
    const textarea = captionRef.current;
    if (!textarea) {
      setCaption(prev => prev + emoji);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCaption = caption.substring(0, start) + emoji + caption.substring(end);
    setCaption(newCaption);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 50);
  };

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

    if (selectedPageIds.length === 0) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ít nhất 1 Fanpage Facebook để đăng bài.' });
      return;
    }

    setPublishing(true);
    setNotice(null);

    try {
      const payload = {
        title,
        caption,
        hashtags,
        firstComment,
        mediaUrl,
        mediaType,
        platforms: ['facebook'],
        targetAccountIds: selectedPageIds,
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
          ? `🚀 Bài viết đã được xuất bản thành công lên ${selectedPageIds.length} Fanpage Facebook được chọn!`
          : '📅 Bài viết đã được thêm vào lịch trình tự động đăng!'
      });

      // Reset Form
      setTitle('');
      setCaption('');
      setFirstComment('');
      setMediaUrl('');
      setMediaFile(null);
      if (onPostCreated) onPostCreated();

    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid-2">
      {/* LEFT: Unified Content Creator */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles color="#1877f2" /> Đăng Bài Fanpage Facebook
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

          {/* 1. Facebook Page Selection Checklist */}
          <div className="form-group" style={{ background: 'rgba(24, 119, 242, 0.06)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(24, 119, 242, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label className="form-label" style={{ margin: 0, color: '#60a5fa' }}>
                <Facebook size={18} /> Chọn Fanpage Đăng Bài ({selectedPageIds.length}/{fbAccounts.length})
              </label>

              {fbAccounts.length > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={toggleSelectAllPages}
                >
                  {selectedPageIds.length === fbAccounts.length ? 'Bỏ Chọn Tất Cả' : 'Chọn Tất Cả'}
                </button>
              )}
            </div>

            {fbAccounts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Chưa có Fanpage nào. Vui lòng sang tab <b>Quản Lý Fanpage</b> dán Access Token để tải danh sách Fanpage.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fbAccounts.map((page) => {
                  const isSelected = selectedPageIds.includes(page.id);
                  return (
                    <div 
                      key={page.id} 
                      onClick={() => togglePageSelection(page.id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        background: isSelected ? 'rgba(24, 119, 242, 0.18)' : 'rgba(11, 15, 25, 0.6)',
                        border: `1px solid ${isSelected ? '#1877f2' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {page.avatar ? (
                          <img src={page.avatar} alt={page.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar-placeholder" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                            {page.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{page.name}</h4>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>ID: {page.id}</span>
                        </div>
                      </div>

                      <div style={{ color: isSelected ? '#60a5fa' : 'var(--text-dim)' }}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Unified Content Textarea & Unicode Font Format Toolbar */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>Nội Dung Bài Đăng (Caption)</label>

              {/* Rich Unicode Formatting Toolbar */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  title="Bôi đen văn bản rồi bấm In Đậm"
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.8rem', fontWeight: 700 }}
                  onClick={() => applyFontStyle('bold')}
                >
                  <Bold size={13} /> 𝗕𝗼𝗹𝗱
                </button>

                <button
                  type="button"
                  title="Bôi đen văn bản rồi bấm In Nghiêng"
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.8rem', fontStyle: 'italic' }}
                  onClick={() => applyFontStyle('italic')}
                >
                  <Italic size={13} /> 𝘐𝘵𝘢𝘭𝘪𝘤
                </button>

                <button
                  type="button"
                  title="Chữ Thư Pháp / Cursive"
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                  onClick={() => applyFontStyle('cursive')}
                >
                  𝒜𝓇𝓉
                </button>

                <button
                  type="button"
                  title="Chữ Gothic"
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                  onClick={() => applyFontStyle('gothic')}
                >
                  𝔊𝔬𝔱𝔥𝔦𝔠
                </button>

                <button
                  type="button"
                  title="Chữ Máy Tính Monospace"
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                  onClick={() => applyFontStyle('monospace')}
                >
                  <Type size={13} /> Code
                </button>
              </div>
            </div>

            {/* Quick Emoji Toolbar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Smile size={14} /> Emoji:
              </span>
              {['🔥', '🚀', '💡', '👉', '✅', '📌', '🎯', '⭐', '💬', '💥', '❤️'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.9rem' }}
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <textarea 
              ref={captionRef}
              className="textarea-field"
              style={{ minHeight: '140px', lineHeight: '1.5' }}
              placeholder="Nhập nội dung bài đăng. Bạn có thể bôi đen chữ rồi bấm nút phông chữ phía trên (In đậm 𝗕𝗼𝗹𝗱, Nghiêng 𝘐𝘵𝘢𝘭𝘪𝘤, 𝒜𝓇𝓉...) để tạo phông chữ bắt mắt trên Facebook!"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* Media Uploader */}
          <div className="form-group">
            <label className="form-label">File Media (Ảnh hoặc Video Reels)</label>
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
                  {uploading ? 'Đang tải file lên máy chủ...' : 'Kéo thả file vào đây hoặc bấm để chọn'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hỗ trợ MP4, MOV (Video Reels) & JPG, PNG</span>
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
            <label className="form-label">Tiêu Đề Video (Dùng khi đăng Facebook Video / Reel)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ví dụ: Chia sẻ bí quyết tăng doanh số năm 2026..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Hashtags */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label"><Hash size={14} /> Hashtags</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#reels', '#viral', '#trending', '#fanpage'].map(tag => (
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
              placeholder="#facebook #reels #shop" 
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* First Comment Auto-Posting */}
          <div className="form-group">
            <label className="form-label">
              <MessageSquare size={16} color="#60a5fa" /> Tự Động Bình Luận Đầu (First Comment)
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ví dụ: 👉 Inbox Fanpage ngay để nhận tư vấn miễn phí!" 
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
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
            {publishing ? '🚀 Đang xuất bản bài đăng lên Facebook Page...' : (postMode === 'now' ? `🚀 Đăng Bài Ngay Lên ${selectedPageIds.length} Fanpage` : '📅 Thêm Vào Lịch Đăng Tự Động')}
          </button>
        </form>
      </div>

      {/* RIGHT: Live Phone Preview Mockup */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={18} color="#1877f2" /> Xem Trước Giao Diện Fanpage
          </h3>
        </div>

        {/* Selected Page Target Display */}
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(24, 119, 242, 0.1)', border: '1px solid rgba(24, 119, 242, 0.2)', fontSize: '0.85rem' }}>
          📌 <b>Đang chọn:</b> {selectedPageIds.length} / {fbAccounts.length} Fanpage Facebook
        </div>

        {/* Phone Device Mockup Container */}
        <div className="phone-mockup" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="preview-header">
            {fbAccounts.find(p => selectedPageIds.includes(p.id))?.avatar ? (
              <img 
                src={fbAccounts.find(p => selectedPageIds.includes(p.id))?.avatar} 
                alt="Fanpage Avatar" 
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <div className="avatar-placeholder">FB</div>
            )}

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {fbAccounts.find(p => selectedPageIds.includes(p.id))?.name || 'Tên Fanpage Facebook'}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Vừa xong • 🌐 Thích Trang</span>
            </div>
          </div>

          <div style={{ fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
            {caption || 'Nội dung xem trước bài đăng của bạn sẽ hiển thị tại đây...'}
            {hashtags && <div style={{ color: '#60a5fa', marginTop: '6px' }}>{hashtags}</div>}
          </div>

          <div style={{ flex: 1, minHeight: '240px', background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mediaUrl ? (
              mediaType === 'video' ? (
                <video src={mediaUrl} controls autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={mediaUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                {mediaType === 'video' ? <Film size={36} /> : <Image size={36} />}
                <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Khung ảnh / Video bài đăng</p>
              </div>
            )}
          </div>

          {firstComment && (
            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', borderLeft: '3px solid #60a5fa', fontSize: '0.8rem' }}>
              💬 <b>First Comment (Tự động):</b> {firstComment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
