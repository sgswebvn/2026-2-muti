import React, { useState } from 'react';
import LiveCommentManager from './LiveCommentManager';

export default function PostHistory({ posts, accounts = [], fetchPosts }) {
  const [publishingId, setPublishingId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Live Comments modal state: { post, account }
  const [activeCommentSession, setActiveCommentSession] = useState(null);

  // Retry / Publish Now
  const handlePublishNow = async (id) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Đăng bài thành công!');
        fetchPosts();
      } else {
        alert(`Lỗi khi đăng: ${data.error || 'Thao tác thất bại'}`);
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ để đăng bài.');
    } finally {
      setPublishingId(null);
    }
  };

  // Delete post
  const handleDeletePost = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi lịch sử?')) return;
    try {
      await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (err) {
      alert('Lỗi khi xóa bài viết');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (post) => {
    setEditingPost({ ...post });
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPost)
      });
      const data = await res.json();
      if (data.success) {
        setEditingPost(null);
        fetchPosts();
      } else {
        alert(`Lỗi lưu: ${data.error}`);
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            Lịch Sử Bài Đăng & Quản Lý Tương Tác ({posts.length})
          </h3>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={fetchPosts}>
            Làm Mới Lịch Sử
          </button>
        </div>

        {posts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Chưa có bài đăng nào trong lịch sử.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {posts.map((post) => {
              const results = post.results || {};

              return (
                <div 
                  key={post.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '18px', 
                    background: '#0f172a',
                    border: '1px solid #334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Left: Media Thumbnail & Content */}
                    <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '280px' }}>
                      {post.mediaUrls && post.mediaUrls.length > 0 ? (
                        post.mediaType === 'video' ? (
                          <video src={post.mediaUrls[0]} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', background: '#000' }} />
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <img src={post.mediaUrls[0]} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                            {post.mediaUrls.length > 1 && (
                              <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                +{post.mediaUrls.length - 1}
                              </span>
                            )}
                          </div>
                        )
                      ) : post.mediaUrl ? (
                        <img src={post.mediaUrl} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                          Văn bản
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          {/* Status Badges */}
                          <span className={`status-badge ${post.status}`}>
                            {post.status.toUpperCase()}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Khởi tạo: {new Date(post.createdAt).toLocaleString('vi-VN')}
                          </span>

                          {post.scheduledAt && (
                            <span style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 600 }}>
                              Hẹn giờ: {new Date(post.scheduledAt).toLocaleString('vi-VN')}
                            </span>
                          )}
                        </div>

                        {post.title && <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>{post.title}</h4>}
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: '1.4', marginBottom: '8px' }}>
                          {post.caption?.substring(0, 160)}{post.caption?.length > 160 ? '...' : ''}
                        </p>

                        {post.firstComment && (
                          <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            First comment / Seeding: <i>"{post.firstComment}"</i>
                          </div>
                        )}

                        {/* Fanpage publish result pills & Live Comments Buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {Object.entries(results).map(([key, res]) => {
                            const accId = res.pageId || key.replace('facebook_', '');
                            const matchedAcc = accounts.find(a => a.id === accId);

                            return (
                              <div 
                                key={key} 
                                style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '4px 10px', 
                                  borderRadius: '6px', 
                                  background: res.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  border: `1px solid ${res.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span style={{ fontWeight: 700, color: res.success ? '#4ade80' : '#f87171' }}>
                                  {res.accountName || 'Fanpage'}:
                                </span>

                                {res.success ? (
                                  <>
                                    {matchedAcc && (
                                      <button 
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                        onClick={() => setActiveCommentSession({ post, account: matchedAcc })}
                                      >
                                        💬 Quản Lý & Rep Bình Luận Trực Tiếp
                                      </button>
                                    )}

                                    {res.postUrl && (
                                      <a 
                                        href={res.postUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
                                      >
                                        Xem FB ↗
                                      </a>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ color: '#f87171' }}>{res.error || 'Lỗi'}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Neatly Redesigned Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => handlePublishNow(post.id)}
                        disabled={publishingId === post.id}
                      >
                        {publishingId === post.id ? 'Đang Đăng...' : 'Đăng Lại'}
                      </button>

                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => handleOpenEdit(post)}
                      >
                        Sửa Bài
                      </button>

                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LIVE COMMENTS & REPLIES MODAL FROM HISTORY TAB */}
      {activeCommentSession && (
        <LiveCommentManager 
          pageAccount={activeCommentSession.account}
          post={activeCommentSession.post}
          onClose={() => setActiveCommentSession(null)}
        />
      )}

      {/* EDIT POST MODAL */}
      {editingPost && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Chỉnh Sửa Bài Viết</h3>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Tiêu đề</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingPost.title || ''} 
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Nội dung bài viết</label>
                <textarea 
                  className="input-field" 
                  rows={5} 
                  value={editingPost.caption || ''} 
                  onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Hashtags</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingPost.hashtags || ''} 
                  onChange={(e) => setEditingPost({ ...editingPost, hashtags: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Bình luận đầu (First comment / Seeding)</label>
                <textarea 
                  className="textarea-field" 
                  rows={2} 
                  value={editingPost.firstComment || ''} 
                  onChange={(e) => setEditingPost({ ...editingPost, firstComment: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPost(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
