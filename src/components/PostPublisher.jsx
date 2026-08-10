import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function PostPublisher({ accounts, draftFromAi, onClearDraftFromAi, onPostCreated }) {
  const fbAccounts = accounts.filter(a => a.platform === 'facebook');

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#facebook #viral');
  const [firstComment, setFirstComment] = useState('');
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  
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
        if (draftFromAi.mediaUrls[0]?.match(/\.(mp4|mov|webm|avi|m4v)$/i)) {
          setMediaType('video');
        }
      }
      setNotice({ type: 'success', text: 'Đã điền nội dung từ AI vào bài đăng. Hãy kiểm tra trước khi bấm Đăng.' });
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
        setNotice({ type: 'success', text: `Đã tải lên ${newUrls.length} file media thành công.` });
      } else {
        throw new Error(data.error || 'Tải media lên thất bại');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const removeMediaUrl = (index) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Quick Preset Helper for Schedule Time
  const setQuickSchedule = (minutesFromNow) => {
    const futureDate = new Date(Date.now() + minutesFromNow * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm
    const tzOffset = futureDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(futureDate - tzOffset)).toISOString().slice(0, 16);
    setScheduledAt(localISOTime);
    setPostMode('schedule');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPageIds.length === 0) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ít nhất 1 Fanpage Facebook để đăng bài.' });
      return;
    }
    if (!caption.trim()) {
      setNotice({ type: 'error', text: 'Nội dung bài viết không được để trống.' });
      return;
    }

    if (postMode === 'schedule') {
      if (!scheduledAt) {
        setNotice({ type: 'error', text: 'Vui lòng chọn ngày và giờ lên lịch đăng bài.' });
        return;
      }
      const schDate = new Date(scheduledAt);
      if (schDate <= new Date()) {
        setNotice({ type: 'error', text: 'Thời gian lên lịch phải ở tương lai.' });
        return;
      }
    }

    setPublishing(true);
    setNotice(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          caption,
          hashtags,
          firstComment,
          autoReplyMessage,
          mediaUrl: mediaUrls[0] || '',
          mediaUrls,
          mediaType,
          postFormat: mediaType === 'video' ? 'reel' : 'standard',
          targetAccountIds: selectedPageIds,
          publishNow: postMode === 'now',
          scheduledAt: postMode === 'schedule' ? new Date(scheduledAt).toISOString() : null
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotice({ 
          type: 'success', 
          text: postMode === 'now' 
            ? 'Đã gửi lệnh đăng bài tới các Fanpage! Bài viết đang được xử lý.' 
            : `Đã lên lịch đăng bài thành công vào lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}!` 
        });

        // Reset form after 1.2s
        setTimeout(() => {
          if (onPostCreated) onPostCreated();
        }, 1200);
      } else {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo bài viết.');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      {/* LEFT: Composer Form */}
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
          {/* SECTION 1: FANPAGE SELECTION */}
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

            {fbAccounts.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px' }}>
                Chưa có Fanpage nào kết nối. Hãy sang tab Quản Lý Tài Khoản để dán Access Token kết nối.
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
                        onChange={() => {}}
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

          {/* SECTION 2: POST CONTENT FIELDS */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Tiêu Đề Bài Viết</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="Nhập tiêu đề (Ví dụ: Super Grok English Title / Tiêu đề bán hàng)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Nội Dung Bài Viết (*)</label>
            <textarea 
              className="input-field" 
              rows={6}
              placeholder="Nhập nội dung chi tiết bài đăng..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Hashtags</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="#facebook #viral #marketing"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Tự Động Seeding Bình Luận (Mỗi câu 1 dòng)</label>
            <textarea 
              className="textarea-field"
              rows={3}
              placeholder="VD: Cần tư vấn giá bao nhiêu shop?&#10;Sản phẩm dùng rất thích ạ&#10;Đã nhắn tin cho shop rồi nhé"
              value={firstComment}
              onChange={(e) => setFirstComment(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Cài Đặt Trả Lời Tự Động Khi Khách Bình Luận (Auto Rep Comment)</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="VD: Dạ chào bạn! Shop đã gửi thông tin tư vấn chi tiết vào hộp thư tin nhắn rồi ạ."
              value={autoReplyMessage}
              onChange={(e) => setAutoReplyMessage(e.target.value)}
            />
          </div>

          {/* SECTION 3: MEDIA UPLOAD */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Hình Ảnh / Video Tệp Đính Kèm</label>

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
                {uploading ? 'Đang tải media lên máy chủ...' : 'Bấm để chọn 1 hoặc nhiều ảnh / video'}
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

          {/* SECTION 4: MODE SWITCHER & SCHEDULING PRESETS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <button 
              type="button" 
              className={`btn ${postMode === 'now' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPostMode('now')}
            >
              🚀 Đăng Bài Ngay
            </button>

            <button 
              type="button" 
              className={`btn ${postMode === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPostMode('schedule')}
            >
              📅 Lên Lịch Đăng Bài
            </button>
          </div>

          {postMode === 'schedule' && (
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #3b82f6', marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Chọn Ngày & Giờ Xuất Bản Chi Tiết
              </label>

              <input 
                type="datetime-local" 
                className="input-field"
                style={{ marginBottom: '10px' }}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />

              {/* Quick Preset Buttons */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Gợi ý nhanh:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setQuickSchedule(2)}>
                  ⏱️ Thử nghiệm đăng sau +2 phút
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setQuickSchedule(15)}>
                  +15 Phút
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setQuickSchedule(60)}>
                  +1 Giờ
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setQuickSchedule(1440)}>
                  +1 Ngày
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
            disabled={publishing}
          >
            {publishing ? 'Đang Xử Lý...' : (postMode === 'now' ? '🚀 Bấm Đăng Bài Ngay' : '📅 Lưu Lịch Đăng Tự Động')}
          </button>
        </form>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
          Xem Trước Giao Diện Bài Đăng Fanpage
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
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {postMode === 'now' ? 'Vừa xong · Quản lý đa kênh' : `Lên lịch xuất bản (${scheduledAt ? new Date(scheduledAt).toLocaleTimeString('vi-VN') : 'chưa chọn giờ'})`}
              </div>
            </div>
          </div>

          {/* Caption preview */}
          <div style={{ fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
            {title && <div style={{ fontWeight: 700, marginBottom: '6px', color: '#38bdf8' }}>{title}</div>}
            {caption || 'Nội dung bài viết sẽ hiển thị tại đây...'}
            {hashtags && <div style={{ color: '#60a5fa', marginTop: '6px' }}>{hashtags}</div>}
          </div>

          {/* Media preview */}
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
              <strong>Bình luận tự động seeding:</strong> {firstComment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
