import React, { useState } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Trash2, Send, Calendar } from 'lucide-react';

export default function PostHistory({ posts, fetchPosts }) {
  const [publishingId, setPublishingId] = useState(null);

  const handlePublishNow = async (id) => {
    setPublishingId(id);
    try {
      const res = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
      } else {
        alert(`Lỗi khi đăng: ${data.error}`);
      }
    } catch (err) {
      alert('Không thể kích hoạt đăng bài.');
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này khỏi lịch sử?')) return;
    try {
      await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      fetchPosts();
    } catch (err) {
      alert('Lỗi khi xóa bài viết');
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock color="#1877f2" /> Lịch Sử & Lịch Đăng Tự Động ({posts.length})
        </h2>

        <button className="btn btn-secondary" onClick={fetchPosts} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
          <RefreshCw size={14} /> Tải Lại Lịch Sử
        </button>
      </div>

      {posts.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Chưa có bài đăng nào trong hệ thống. Hãy sang tab "Đăng Bài Nhanh" để tạo bài đăng đầu tiên!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post) => {
            const results = post.results || {};

            return (
              <div 
                key={post.id} 
                className="glass-card" 
                style={{ 
                  padding: '20px', 
                  background: 'rgba(11, 15, 25, 0.6)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  {/* Left: Thumbnail & Post Content Info */}
                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    {post.mediaUrl ? (
                      post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', background: '#000' }} />
                      ) : (
                        <img src={post.mediaUrl} alt="Thumbnail" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                      )
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Text Only
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span className={`status-badge ${post.status}`}>
                          {post.status === 'published' && <CheckCircle2 size={12} />}
                          {post.status === 'scheduled' && <Clock size={12} />}
                          {post.status === 'failed' && <AlertTriangle size={12} />}
                          {post.status.toUpperCase()}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Khởi tạo: {new Date(post.createdAt).toLocaleString('vi-VN')}
                        </span>

                        {post.scheduledAt && (
                          <span style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 600 }}>
                            📅 Hẹn giờ đăng: {new Date(post.scheduledAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>

                      {post.title && <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>{post.title}</h4>}
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4', marginBottom: '8px' }}>
                        {post.caption?.substring(0, 140)}{post.caption?.length > 140 ? '...' : ''}
                      </p>

                      {/* Results Links Per Platform */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {Object.entries(results).map(([key, res]) => (
                          <div 
                            key={key} 
                            style={{ 
                              fontSize: '0.8rem', 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              background: res.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: `1px solid ${res.success ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: res.success ? '#4ade80' : '#f87171' }}>
                              {res.platform?.toUpperCase()}:
                            </span>

                            {res.success ? (
                              <a 
                                href={res.postUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                              >
                                Xem bài đăng <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span style={{ color: '#f87171' }}>{res.error || 'Thất bại'}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {post.status !== 'published' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => handlePublishNow(post.id)}
                        disabled={publishingId === post.id}
                      >
                        {publishingId === post.id ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                        Đăng Ngay
                      </button>
                    )}

                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 size={14} /> Xóa Bài
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
