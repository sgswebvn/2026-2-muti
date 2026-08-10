import React, { useState, useEffect } from 'react';

export default function PostPublisher({ accounts, draftFromAi, onClearDraftFromAi, onPostCreated }) {
  const fbAccounts = accounts.filter(a => a.platform === 'facebook');

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#facebook #viral');
  const [firstComment, setFirstComment] = useState('');
  
  // Media state: supports single or multiple uploaded image/video URLs
  const [mediaUrls, setMediaUrls] = useState([]);
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [uploading, setUploading] = useState(false);

  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const [activeGroupTab, setActiveGroupTab] = useState('ALL');

  const [postMode, setPostMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledAt, setScheduledAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState(null);

  // Initialize selectedPageIds when fbAccounts change
  useEffect(() => {
    if (fbAccounts.length > 0 && selectedPageIds.length === 0) {
      setSelectedPageIds(fbAccounts.map(a => a.id));
    }
  }, [accounts]);

  // Auto-populate when draftFromAi is passed
  useEffect(() => {
    if (draftFromAi) {
      if (draftFromAi.title) setTitle(draftFromAi.title);
      if (draftFromAi.caption) setCaption(draftFromAi.caption);
      if (draftFromAi.hashtags) setHashtags(draftFromAi.hashtags);
      if (draftFromAi.firstComment) setFirstComment(draftFromAi.firstComment);
      if (draftFromAi.mediaUrls && draftFromAi.mediaUrls.length > 0) {
        setMediaUrls(draftFromAi.mediaUrls);
      }
      setNotice({ type: 'success', text: 'Đã điền nội dung từ ChatGPT vào bài đăng. Bạn có thể kiểm tra lại trước khi bấm Đăng.' });
      if (onClearDraftFromAi) onClearDraftFromAi();
    }
  }, [draftFromAi]);

  // Unique groups list
  const groupsList = Array.from(new Set(fbAccounts.map(a => a.group || 'Mặc định')));

  const togglePageSelection = (pageId) => {
    if (selectedPageIds.includes(pageId)) {
      setSelectedPageIds(selectedPageIds.filter(id => id !== pageId));
    } else {
      setSelectedPageIds([...selectedPageIds, pageId]);
    }
  };

  // Select all pages belonging to a specific group
  const selectPagesByGroup = (groupName) => {
    setActiveGroupTab(groupName);
    if (groupName === 'ALL') {
      setSelectedPageIds(fbAccounts.map(a => a.id));
    } else {
      const groupPageIds = fbAccounts
        .filter(a => (a.group || 'Mặc định') === groupName)
        .map(a => a.id);
      setSelectedPageIds(groupPageIds);
    }
  };

  const selectAllPages = () => {
    if (selectedPageIds.length === fbAccounts.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(fbAccounts.map(a => a.id));
    }
  };

  // Multiple files upload handler
  const handleMultipleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setNotice(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('media', files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        const newUrls = data.mediaUrls || [data.fileUrl];
        setMediaUrls(prev => [...prev, ...newUrls]);
        setMediaType(data.mediaType || 'image');
      } else {
        throw new Error(data.error || 'Tải file thất bại');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const removeMediaUrl = (indexToRemove) => {
    setMediaUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim() && mediaUrls.length === 0) {
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
        mediaUrl: mediaUrls[0] || '',
        mediaUrls: mediaUrls,
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
          ? `Bài viết đã xuất bản thành công lên ${selectedPageIds.length} Fanpage Facebook!`
          : 'Bài viết đã được thêm vào lịch trình tự động đăng!'
      });

      // Reset Form
      setTitle('');
      setCaption('');
      setFirstComment('');
      setMediaUrls([]);
      if (onPostCreated) onPostCreated();

    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* LEFT: Clean Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
          Soạn Bài Đăng Fanpage
        </h2>

        {notice && (
          <div className={`alert alert-${notice.type}`} style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem' }}>
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: FANPAGE SELECTION AT THE VERY TOP (VISUAL & INTUITIVE) */}
          <div 
            style={{ 
              background: '#0f172a', 
              padding: '16px', 
              borderRadius: '10px', 
              border: '1px solid #334155',
              marginBottom: '20px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span className="form-label" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  Chọn Fanpage Đăng Bài
                </span>
                <span style={{ fontSize: '0.8rem', color: '#60a5fa', marginLeft: '8px', fontWeight: 600 }}>
                  (Đã chọn {selectedPageIds.length}/{fbAccounts.length})
                </span>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={selectAllPages}
              >
                {selectedPageIds.length === fbAccounts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            {/* Quick Group Tabs (Chọn Theo Nhóm Chủ Đề) */}
            {groupsList.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  type="button"
                  className={`btn ${activeGroupTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 12px', fontSize: '0.785rem' }}
                  onClick={() => selectPagesByGroup('ALL')}
                >
                  Tất cả nhóm
                </button>
                {groupsList.map(grp => (
                  <button
                    key={grp}
                    type="button"
                    className={`btn ${activeGroupTab === grp ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 12px', fontSize: '0.785rem' }}
                    onClick={() => selectPagesByGroup(grp)}
                  >
                    Nhóm: {grp}
                  </button>
                ))}
              </div>
            )}

            {/* Visual Fanpage Cards Grid */}
            {fbAccounts.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px' }}>
                Chưa có Fanpage nào kết nối. Hãy sang tab Fanpage & Roles để kết nối tài khoản.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                {fbAccounts.map(acc => {
                  const isSelected = selectedPageIds.includes(acc.id);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => togglePageSelection(acc.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(37, 99, 235, 0.2)' : '#1e293b',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #334155',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div onClick
                        style={{ cursor: 'pointer' }}
                      />
                      {acc.avatar ? (
                        <img src={acc.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                          f
                        </div>
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {acc.group || 'Mặc định'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: CLEAN POST CONTENT FIELDS */}

          {/* Title */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Tiêu Đề</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Nhập tiêu đề..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Caption Textarea */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Nội Dung Bài Viết</label>
            <textarea 
              className="input-field" 
              rows={6}
              placeholder="Nhập nội dung bài đăng..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
            />
          </div>

          {/* Hashtags & First Comment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Hashtags</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="#hashtag1 #hashtag2"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bình Luận Đầu (First Comment)</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Bình luận tự động..."
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
              />
            </div>
          </div>

          {/* Multiple Image / Video Upload */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Hình Ảnh / Video</label>

            <div 
              style={{
                border: '1px dashed #475569',
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'center',
                background: '#0f172a',
                cursor: 'pointer',
                marginBottom: mediaUrls.length > 0 ? '10px' : '0'
              }}
              onClick={() => document.getElementById('multi-file-input').click()}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {uploading ? 'Đang tải media lên...' : 'Bấm để chọn 1 hoặc nhiều ảnh / video'}
              </div>
              <input 
                id="multi-file-input"
                type="file" 
                multiple
                accept="image/*,video/*" 
                style={{ display: 'none' }}
                onChange={(e) => handleMultipleFileUpload(e.target.files)}
              />
            </div>

            {/* Media Preview Grid */}
            {mediaUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {mediaUrls.map((url, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      position: 'relative', 
                      height: '80px', 
                      borderRadius: '6px', 
                      overflow: 'hidden', 
                      border: '1px solid #334155' 
                    }}
                  >
                    {mediaType === 'video' || /\.(mp4|mov|webm|avi|m4v)$/i.test(url) ? (
                      <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}

                    <button
                      type="button"
                      onClick={() => removeMediaUrl(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#0f172a',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mode Switcher & Submit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <button 
              type="button" 
              className={`btn ${postMode === 'now' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPostMode('now')}
            >
              Đăng Ngay
            </button>

            <button 
              type="button" 
              className={`btn ${postMode === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPostMode('schedule')}
            >
              Lên Lịch Đăng Bài
            </button>
          </div>

          {postMode === 'schedule' && (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Chọn Ngày & Giờ Xuất Bản</label>
              <input 
                type="datetime-local" 
                className="input-field"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600 }}
            disabled={publishing}
          >
            {publishing ? 'Đang Xử Lý...' : (postMode === 'now' ? 'Bấm Đăng Bài Ngay' : 'Lưu Lịch Đăng Tự Động')}
          </button>
        </form>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
          Xem Trước Giao Diện Bài Đăng
        </h3>

        <div 
          style={{ 
            background: '#1e293b', 
            borderRadius: '8px', 
            padding: '14px', 
            color: '#f8fafc',
            border: '1px solid #334155' 
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
              f
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {fbAccounts.length > 0 ? fbAccounts[0].name : 'Tên Fanpage Facebook'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Vừa xong · Quản lý đa kênh</div>
            </div>
          </div>

          {/* Caption preview (Title prepended) */}
          <div style={{ fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
            {title && <div style={{ fontWeight: 700, marginBottom: '6px' }}>{title}</div>}
            {caption || 'Nội dung bài viết sẽ hiển thị tại đây...'}
            {hashtags && <div style={{ color: '#60a5fa', marginTop: '6px' }}>{hashtags}</div>}
          </div>

          {/* Media preview (Supports HTML5 Video player or Image grid) */}
          {mediaUrls.length > 0 ? (
            <div 
              style={{ 
                borderRadius: '6px', 
                overflow: 'hidden', 
                background: '#0f172a',
                display: 'grid',
                gridTemplateColumns: (mediaUrls.length > 1 && mediaType !== 'video') ? '1fr 1fr' : '1fr',
                gap: '4px',
                maxHeight: '320px'
              }}
            >
              {mediaUrls.slice(0, 4).map((url, idx) => {
                const isVideo = mediaType === 'video' || /\.(mp4|mov|webm|avi|m4v)$/i.test(url);
                return isVideo ? (
                  <video 
                    key={idx}
                    src={url} 
                    controls 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', background: '#000' }} 
                  />
                ) : (
                  <img 
                    key={idx}
                    src={url} 
                    alt="" 
                    style={{ width: '100%', height: mediaUrls.length > 1 ? '140px' : '260px', objectFit: 'cover' }} 
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ height: '120px', borderRadius: '6px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              Khu vực hiển thị Hình ảnh / Video
            </div>
          )}

          {/* First Comment */}
          {firstComment && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8' }}>
              <strong>Bình luận tự động:</strong> {firstComment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
