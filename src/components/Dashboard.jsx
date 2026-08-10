import React from 'react';

export default function Dashboard({ posts = [], accounts = [], onNavigate }) {
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const scheduledPosts = posts.filter(p => p.status === 'scheduled').length;
  const failedPosts = posts.filter(p => p.status === 'failed').length;

  const activeAccounts = accounts.filter(a => a.tokenStatus !== 'invalid' && a.tokenStatus !== 'expired').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>
            Tổng Quan Hệ Thống & Trạng Thái
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Theo dõi hiệu suất xuất bản bài đăng và tình trạng các tài khoản Fanpage.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('publish')}
          >
            Đăng Bài Mới
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('ai')}
          >
            AI Content Studio
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Total Posts */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tổng Số Bài Đăng</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc' }}>{totalPosts}</div>
        </div>

        {/* Published */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Đã Đăng Thành Công</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>{publishedPosts}</div>
        </div>

        {/* Scheduled */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Đang Chờ Lên Lịch</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#facc15' }}>{scheduledPosts}</div>
        </div>

        {/* Failed */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Bài Viết Bị Lỗi</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171' }}>{failedPosts}</div>
        </div>

        {/* Accounts Status */}
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fanpage Đang Quản Lý</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>
            {accounts.length} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#4ade80' }}>({activeAccounts} Hoạt động)</span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Account Token Health Overview */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
            Tình Trạng Kết Nối Fanpage ({accounts.length})
          </h3>

          {accounts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chưa có Fanpage nào được kết nối. Sang tab Quản Lý Fanpage để kết nối.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {accounts.map(acc => {
                const isInvalid = acc.tokenStatus === 'invalid' || acc.tokenStatus === 'expired';
                return (
                  <div 
                    key={acc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      border: '1px solid #334155'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {acc.avatar && <img src={acc.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{acc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {acc.id}</div>
                      </div>
                    </div>

                    <div>
                      {isInvalid ? (
                        <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>Lỗi Token</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Hoạt động</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Posts */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              Bài Viết Gần Đây
            </h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate('history')}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              Xem tất cả ({totalPosts})
            </button>
          </div>

          {posts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chưa có bài viết nào trong hệ thống.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {posts.slice(0, 5).map(post => (
                <div 
                  key={post.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {post.title || post.caption || 'Bài viết không tiêu đề'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(post.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div>
                    {post.status === 'published' && <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Đã đăng</span>}
                    {post.status === 'scheduled' && <span style={{ fontSize: '0.75rem', color: '#facc15' }}>Lên lịch</span>}
                    {post.status === 'failed' && <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Thất bại</span>}
                    {post.status === 'draft' && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nháp</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
