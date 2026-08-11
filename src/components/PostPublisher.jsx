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

  const [accountVariations, setAccountVariations] = useState({});
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [activeVariationPageId, setActiveVariationPageId] = useState(null);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);

  // Generate Multi-Page AI Variations
  const handleGenerateVariations = async () => {
    if (selectedPageIds.length === 0) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ít nhất 1 Fanpage để sinh biến thể AI.' });
      return;
    }

    const targetPages = fbAccounts.filter(a => selectedPageIds.includes(a.id));
    setGeneratingVariations(true);
    setNotice({ type: 'info', text: `🤖 Đang gọi AI Google Gemini 1.5 phân tích video & tạo ${targetPages.length} biến thể Tiếng Anh độc bản...` });

    try {
      const res = await fetch('/api/ai/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: mediaUrls[0] || '',
          videoTopic: title || '',
          videoPrompt: caption || title || 'Phân tích video thu hút',
          originalName: mediaUrls[0]?.split('/')?.pop() || '',
          pageAccounts: targetPages,
          model: 'gemini'
        })
      });

      const data = await res.json();
      if (data.success && data.variations) {
        setAccountVariations(data.variations);
        setActiveVariationPageId(targetPages[0]?.id || null);
        setIsVariationModalOpen(true); // Automatically open variation modal popup
        setNotice({
          type: 'success',
          text: `🎉 Đã tạo thành công ${Object.keys(data.variations).length} biến thể phân tích Tiếng Anh cho ${targetPages.length} Fanpage!`
        });
      } else {
        throw new Error(data.error || 'Không thể sinh biến thể AI.');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setGeneratingVariations(false);
    }
  };

  const updateIndividualVariation = (pageId, field, value) => {
    setAccountVariations(prev => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedPageIds.length === 0) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ít nhất 1 Fanpage Facebook để đăng bài.' });
      return;
    }
    if (!caption.trim() && Object.keys(accountVariations).length === 0) {
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
          accountVariations: accountVariations,
          publishNow: postMode === 'now',
          scheduledAt: postMode === 'schedule' ? new Date(scheduledAt).toISOString() : null
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotice({ 
          type: 'success', 
          text: postMode === 'now' 
            ? `Đã gửi lệnh đăng bài tới ${selectedPageIds.length} Fanpage! (${Object.keys(accountVariations).length > 0 ? 'Đã áp dụng biến thể AI độc bản cho từng trang' : 'Nội dung chung'})` 
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

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalGroupFilter, setModalGroupFilter] = useState('ALL');

  const filteredModalAccounts = fbAccounts.filter(acc => {
    const matchesSearch = !modalSearchQuery.trim() || 
      acc.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
      acc.id.includes(modalSearchQuery);
    const matchesGroup = modalGroupFilter === 'ALL' || (acc.group || 'Mặc định') === modalGroupFilter;
    return matchesSearch && matchesGroup;
  });

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
          {/* SECTION 1: VISUAL FANPAGE & GROUP SELECTION CARD */}
          <div 
            style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', 
              padding: '18px', 
              borderRadius: '12px', 
              border: '1px solid #3b82f6',
              marginBottom: '20px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div className="form-label" style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📂 Bảng Chọn Fanpage & Nhóm</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '2px' }}>
                  Đã chọn <strong style={{ color: '#4ade80', fontSize: '1.1rem' }}>{selectedPageIds.length}</strong> / <strong>{fbAccounts.length}</strong> Fanpage kết nối
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                  onClick={selectAllPages}
                >
                  {selectedPageIds.length === fbAccounts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ 
                    fontSize: '0.875rem', 
                    padding: '8px 16px', 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                  }}
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  🔍 MỞ BẢNG CHỌN NHÓM & FANPAGE (BẢNG RỘNG)
                </button>
              </div>
            </div>

            {/* Selected Groups Chips Preview */}
            {groupsList.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Lọc nhanh theo nhóm:</span>
                <button
                  type="button"
                  className={`btn ${activeGroupTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                  onClick={() => selectPagesByGroup('ALL')}
                >
                  Tất cả ({fbAccounts.length})
                </button>
                {groupsList.map(grp => {
                  const countInGrp = fbAccounts.filter(a => (a.group || 'Mặc định') === grp).length;
                  const selectedInGrp = fbAccounts.filter(a => (a.group || 'Mặc định') === grp && selectedPageIds.includes(a.id)).length;
                  return (
                    <button
                      key={grp}
                      type="button"
                      className={`btn ${activeGroupTab === grp ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                      onClick={() => selectPagesByGroup(grp)}
                    >
                      {grp} ({selectedInGrp}/{countInGrp})
                    </button>
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

          {/* AI MULTI-VARIATION GENERATOR BUTTON & ACCORDION EDITOR */}
          <div style={{ background: '#0b1329', padding: '16px', borderRadius: '10px', border: '1px solid #3b82f6', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={18} /> Đa Nội Dung AI Cho {selectedPageIds.length} Fanpage
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tự động sinh {selectedPageIds.length} bản nội dung với 15 góc nhìn phân tích khác nhau cho cùng 1 video/media.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                onClick={handleGenerateVariations}
                disabled={generatingVariations}
              >
                {generatingVariations ? '⏳ Gemini AI Đang Phân Tích...' : `🤖 Sinh ${selectedPageIds.length} Biến Thể AI`}
              </button>
            </div>

            {Object.keys(accountVariations).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid #3b82f6', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.825rem', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✨ Đã sinh {Object.keys(accountVariations).length} bản phân tích AI độc bản (Tiếng Anh 100%)
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 12px', fontWeight: 600, background: '#1e293b' }}
                  onClick={() => setIsVariationModalOpen(true)}
                >
                  👁️ Bấm Để Xem & Chỉnh Sửa Biến Thể
                </button>
              </div>
            )}
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
                borderRadius: '8px', 
                overflow: 'hidden', 
                background: '#0f172a',
                display: 'grid',
                gridTemplateColumns: (mediaUrls.length > 1 && mediaType !== 'video') ? '1fr 1fr' : '1fr',
                gap: '6px',
                maxHeight: '520px',
                width: '100%'
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
                    style={{ width: '100%', maxHeight: '480px', borderRadius: '6px', objectFit: 'contain', background: '#000' }} 
                  />
                ) : (
                  <img 
                    key={idx}
                    src={url} 
                    alt="" 
                    style={{ width: '100%', height: mediaUrls.length > 1 ? '160px' : '380px', objectFit: 'cover' }} 
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

      {/* FULL-SCREEN EXPANDED GROUP & FANPAGE SELECTION MODAL */}
      {isGroupModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '94vw',
              maxWidth: '1280px',
              height: '88vh',
              background: '#0b1329',
              border: '1px solid #3b82f6',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div 
              style={{ 
                padding: '20px 24px', 
                borderBottom: '1px solid #1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                background: '#0f172a'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📂 BẢNG CHỌN FANPAGE & NHÓM MỞ RỘNG
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Chọn hoặc bỏ chọn danh sách trang hiển thị trực quan theo nhóm không cần cuộn chật hẹp.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: 700 }}
                  onClick={() => setIsGroupModalOpen(false)}
                >
                  ✅ XÁC NHẬN VÀ ÁP DỤNG ({selectedPageIds.length} TRANG)
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                  onClick={() => setIsGroupModalOpen(false)}
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Toolbar: Search & Group Filter Bar */}
            <div 
              style={{ 
                padding: '14px 24px', 
                background: '#1e293b', 
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              {/* Search Bar */}
              <input 
                type="text" 
                className="input-field" 
                placeholder="🔍 Tìm nhanh theo tên trang hoặc ID..." 
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                style={{ width: '280px', fontSize: '0.875rem' }}
              />

              {/* Group Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '4px' }}>
                <button
                  type="button"
                  className={`btn ${modalGroupFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setModalGroupFilter('ALL')}
                >
                  Tất cả nhóm ({fbAccounts.length})
                </button>

                {groupsList.map(grp => {
                  const totalInGrp = fbAccounts.filter(a => (a.group || 'Mặc định') === grp).length;
                  const selectedInGrp = fbAccounts.filter(a => (a.group || 'Mặc định') === grp && selectedPageIds.includes(a.id)).length;
                  return (
                    <button
                      key={grp}
                      type="button"
                      className={`btn ${modalGroupFilter === grp ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8rem', padding: '6px 14px', whiteSpace: 'nowrap' }}
                      onClick={() => setModalGroupFilter(grp)}
                    >
                      Nhóm: {grp} ({selectedInGrp}/{totalInGrp})
                    </button>
                  );
                })}
              </div>

              {/* Quick Select Actions for Filtered View */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                  onClick={() => {
                    const idsInFilter = filteredModalAccounts.map(a => a.id);
                    setSelectedPageIds(Array.from(new Set([...selectedPageIds, ...idsInFilter])));
                  }}
                >
                  Tích chọn {filteredModalAccounts.length} trang đang lọc
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                  onClick={() => {
                    const idsInFilter = filteredModalAccounts.map(a => a.id);
                    setSelectedPageIds(selectedPageIds.filter(id => !idsInFilter.includes(id)));
                  }}
                >
                  Bỏ chọn {filteredModalAccounts.length} trang đang lọc
                </button>
              </div>
            </div>

            {/* Large Visual Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0b1329' }}>
              {filteredModalAccounts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không tìm thấy Fanpage nào phù hợp với bộ lọc tìm kiếm.
                </div>
              ) : (
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                    gap: '14px' 
                  }}
                >
                  {filteredModalAccounts.map(acc => {
                    const isSelected = selectedPageIds.includes(acc.id);
                    const isCheckpoint = acc.tokenStatus === 'checkpoint';
                    return (
                      <div
                        key={acc.id}
                        onClick={() => togglePageSelection(acc.id)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(37, 99, 235, 0.25)' : '#0f172a',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                          boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />

                        {acc.avatar ? (
                          <img src={acc.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            f
                          </div>
                        )}

                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                            {acc.name}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#334155', color: '#94a3b8' }}>
                              {acc.group || 'Mặc định'}
                            </span>

                            {isCheckpoint ? (
                              <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>🚨 Checkpoint</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600 }}>Hoạt động</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer Bar */}
            <div 
              style={{ 
                padding: '16px 24px', 
                background: '#0f172a', 
                borderTop: '1px solid #1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Đã chọn <strong style={{ color: '#4ade80', fontSize: '1.1rem' }}>{selectedPageIds.length}</strong> / <strong>{fbAccounts.length}</strong> Fanpage.
              </div>

              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700 }}
                onClick={() => setIsGroupModalOpen(false)}
              >
                ✅ XÁC NHẬN CHỌN ({selectedPageIds.length} FANPAGE)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPACT MODAL POPUP FOR PREVIEWING & EDITING AI VARIATIONS */}
      {isVariationModalOpen && Object.keys(accountVariations).length > 0 && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '90vw',
              maxWidth: '1100px',
              height: '82vh',
              background: '#0b1329',
              border: '1px solid #3b82f6',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div 
              style={{ 
                padding: '20px 24px', 
                borderBottom: '1px solid #1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                background: '#0f172a'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✨ BẢNG BIẾN THỂ AI PHÂN TÍCH VIDEO (100% ENGLISH)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Tự động tạo {Object.keys(accountVariations).length} bản phân tích video Tiếng Anh ngắn gọn (2-3 câu) với các góc nhìn khác nhau cho từng trang.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.9rem', fontWeight: 700, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}
                  onClick={() => setIsVariationModalOpen(false)}
                >
                  ✅ LƯU & DÙNG CÁC BIẾN THỂ NÀY
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                  onClick={() => setIsVariationModalOpen(false)}
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Fanpage Selection Tabs Bar */}
            <div 
              style={{ 
                padding: '12px 24px', 
                background: '#1e293b', 
                borderBottom: '1px solid #334155',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto'
              }}
            >
              {fbAccounts.filter(a => selectedPageIds.includes(a.id)).map(acc => {
                const isActive = (activeVariationPageId || selectedPageIds[0]) === acc.id;
                const hasVar = Boolean(accountVariations[acc.id]);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setActiveVariationPageId(acc.id)}
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 14px',
                      whiteSpace: 'nowrap',
                      border: isActive ? '2px solid #3b82f6' : '1px solid #334155'
                    }}
                  >
                    {acc.name} {hasVar ? '✨' : ''}
                  </button>
                );
              })}
            </div>

            {/* Modal Body - Editor for Active Page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#0b1329' }}>
              {(() => {
                const targetPageId = activeVariationPageId || selectedPageIds[0];
                const activeAccount = fbAccounts.find(a => a.id === targetPageId);
                const currentVar = accountVariations[targetPageId];

                if (!currentVar) {
                  return (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa sinh biến thể cho trang này. Bấm nút "Sinh Biến Thể AI" để tạo.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '850px', margin: '0 auto' }}>
                    <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: 700 }}>
                        Trang áp dụng: {activeAccount?.name || targetPageId}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(37,99,235,0.2)', padding: '3px 8px', borderRadius: '4px' }}>
                        Tự động sinh bởi Google Gemini 1.5 AI
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#38bdf8' }}>Tiêu Đề Tiếng Anh (English Title)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={currentVar.title || ''}
                        onChange={(e) => updateIndividualVariation(targetPageId, 'title', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#38bdf8' }}>
                        Nội Dung Phân Tích Video Tiếng Anh (English Video Summary Analysis)
                      </label>
                      <textarea
                        className="input-field"
                        rows={5}
                        style={{ lineHeight: '1.6', fontSize: '0.925rem' }}
                        value={currentVar.caption || ''}
                        onChange={(e) => updateIndividualVariation(targetPageId, 'caption', e.target.value)}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Nội dung Tiếng Anh xúc tích 2-3 câu phân tích chủ đề video (Có thể chỉnh sửa tùy ý).
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#38bdf8' }}>Hashtags</label>
                      <input
                        type="text"
                        className="input-field"
                        value={currentVar.hashtags || ''}
                        onChange={(e) => updateIndividualVariation(targetPageId, 'hashtags', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#38bdf8' }}>First Comment Seeding (English)</label>
                      <input
                        type="text"
                        className="input-field"
                        value={currentVar.firstComment || ''}
                        onChange={(e) => updateIndividualVariation(targetPageId, 'firstComment', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div 
              style={{ 
                padding: '16px 24px', 
                background: '#0f172a', 
                borderTop: '1px solid #1e293b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Tổng số biến thể: <strong style={{ color: '#4ade80' }}>{Object.keys(accountVariations).length}</strong> bản nội dung Tiếng Anh độc bản
              </div>

              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 700 }}
                onClick={() => setIsVariationModalOpen(false)}
              >
                ✅ XÁC NHẬN VÀ LƯU TẤT CẢ BIẾN THỂ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
