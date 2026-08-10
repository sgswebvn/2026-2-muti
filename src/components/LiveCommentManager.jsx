import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, RefreshCw, CheckCircle, User } from 'lucide-react';

export default function LiveCommentManager({ pageAccount, post, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Reply inputs state: { [commentId]: string }
  const [replyInputs, setReplyInputs] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [aiGeneratingId, setAiGeneratingId] = useState(null);

  // New Page comment state
  const [newPageComment, setNewPageComment] = useState('');
  const [postingPageComment, setPostingPageComment] = useState(false);
  const [notice, setNotice] = useState(null);

  const resultObj = post.results ? (post.results[`facebook_${pageAccount.id}`] || post.results[pageAccount.id]) : null;
  const fbPostId = resultObj ? resultObj.postId : null;

  useEffect(() => {
    if (pageAccount && fbPostId) {
      fetchLiveComments();
    }
  }, [pageAccount, fbPostId]);

  const fetchLiveComments = async () => {
    if (!pageAccount || !fbPostId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${pageAccount.id}/posts/${fbPostId}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      } else {
        throw new Error(data.error || 'Không thể tải bình luận từ Facebook');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReply = async (targetId, messageText) => {
    if (!messageText || !messageText.trim()) return;
    setReplyingId(targetId);
    setNotice(null);
    try {
      const res = await fetch(`/api/accounts/${pageAccount.id}/posts/${fbPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, message: messageText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setReplyInputs({ ...replyInputs, [targetId]: '' });
        setNotice({ type: 'success', text: 'Đã gửi phản hồi thành công lên Facebook!' });
        fetchLiveComments();
      } else {
        throw new Error(data.error || 'Lỗi đăng bình luận');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setReplyingId(null);
    }
  };

  const handleAiSuggest = async (commentId, customerText) => {
    setAiGeneratingId(commentId);
    try {
      const res = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: customerText, postTopic: post.title || post.caption || '' })
      });
      const data = await res.json();
      if (data.success && data.replyText) {
        setReplyInputs({ ...replyInputs, [commentId]: data.replyText });
      }
    } catch (err) {
      alert('Không thể tạo gợi ý AI');
    } finally {
      setAiGeneratingId(null);
    }
  };

  const handlePostPageNewComment = async (e) => {
    e.preventDefault();
    if (!newPageComment.trim() || !fbPostId) return;
    setPostingPageComment(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/accounts/${pageAccount.id}/posts/${fbPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: fbPostId, message: newPageComment.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewPageComment('');
        setNotice({ type: 'success', text: 'Đã đăng bình luận mới với tư cách Fanpage thành công!' });
        fetchLiveComments();
      } else {
        throw new Error(data.error || 'Lỗi đăng bình luận');
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    } finally {
      setPostingPageComment(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: '24px', background: '#0f172a', border: '1px solid #334155' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} /> Quản Lý & Trả Lời Bình Luận Trực Tiếp
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              Fanpage: <strong>{pageAccount.name}</strong> · Bài viết: {post.title || post.caption?.substring(0, 40)}...
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchLiveComments} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Đang Tải...' : 'Làm Mới'}
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>

        {/* Notice Message */}
        {notice && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem', background: notice.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: notice.type === 'success' ? '#4ade80' : '#f87171', border: '1px solid ' + (notice.type === 'success' ? '#22c55e' : '#ef4444') }}>
            {notice.text}
          </div>
        )}

        {/* Top Form: Post New Comment as Page */}
        <form onSubmit={handlePostPageNewComment} style={{ marginBottom: '16px', background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Viết bình luận mới với tư cách Fanpage này..."
            value={newPageComment}
            onChange={(e) => setNewPageComment(e.target.value)}
            style={{ flex: 1, fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }} disabled={postingPageComment}>
            {postingPageComment ? 'Đang gửi...' : 'Đăng Bình Luận'}
          </button>
        </form>

        {/* Live Comments List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
          {error && (
            <div style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem' }}>
              Lỗi kết nối Facebook: {error}. Vui lòng đảm bảo Access Token có đủ quyền <code>pages_manage_engagement</code>.
            </div>
          )}

          {!loading && comments.length === 0 && !error && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              Chưa có bình luận nào trên bài viết này. Hãy đăng bình luận đầu tiên hoặc chờ khách hàng tương tác!
            </div>
          )}

          {comments.map((cmt) => {
            const isPageSelf = cmt.from && cmt.from.id === pageAccount.id;
            const replies = cmt.comments?.data || [];
            const currentReplyText = replyInputs[cmt.id] || '';

            return (
              <div key={cmt.id} style={{ background: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                
                {/* Main Comment Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {cmt.from?.picture?.data?.url ? (
                    <img src={cmt.from.picture.data.url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color="#94a3b8" />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isPageSelf ? '#60a5fa' : '#f8fafc' }}>
                        {cmt.from?.name || 'Khách hàng'}
                      </span>
                      {isPageSelf && (
                        <span style={{ fontSize: '0.65rem', background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Fanpage</span>
                      )}
                      <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                        {new Date(cmt.created_time).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.875rem', marginTop: '4px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                      {cmt.message}
                    </div>

                    {/* Replies Tree */}
                    {replies.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px', borderLeft: '2px solid #334155' }}>
                        {replies.map((reply) => (
                          <div key={reply.id} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem' }}>
                              <span style={{ fontWeight: 700, color: reply.from?.id === pageAccount.id ? '#60a5fa' : '#f8fafc' }}>
                                {reply.from?.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {new Date(reply.created_time).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.825rem', marginTop: '2px', color: '#cbd5e1' }}>
                              {reply.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input Box for Customer Comment */}
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="Nhập nội dung trả lời..."
                          value={currentReplyText}
                          onChange={(e) => setReplyInputs({ ...replyInputs, [cmt.id]: e.target.value })}
                          style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }}
                        />

                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleAiSuggest(cmt.id, cmt.message)}
                          disabled={aiGeneratingId === cmt.id}
                        >
                          <Sparkles size={13} color="#facc15" />
                          {aiGeneratingId === cmt.id ? 'AI Đang Gợi Ý...' : 'AI Gợi Ý Rep'}
                        </button>

                        <button 
                          type="button" 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handlePostReply(cmt.id, currentReplyText)}
                          disabled={replyingId === cmt.id || !currentReplyText.trim()}
                        >
                          <Send size={13} />
                          {replyingId === cmt.id ? 'Đang gửi...' : 'Trả Lời'}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
