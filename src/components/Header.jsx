import React from 'react';

export default function Header({ activeTab, setActiveTab, accountCount, onOpenGuide, onOpenBackup }) {
  return (
    <header className="glass-card app-header" style={{ padding: '14px 20px', marginBottom: '20px' }}>
      <div className="brand">
        <div>
          <h1 className="brand-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Facebook Multi-Publisher</h1>
          <p className="brand-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Quản Lý & Đăng Bài Tự Động Đa Fanpage
          </p>
        </div>
      </div>

      <nav className="nav-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span>Dashboard</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <span>Soạn Bài Thủ Công</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <span>📹 Phân Tích Video AI</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <span>Fanpage & Roles ({accountCount})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span>Lịch Sử Bài Đăng</span>
        </button>

        <button
          className="tab-btn"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#ffffff', border: '1px solid #60a5fa', fontWeight: 600 }}
          onClick={onOpenBackup}
        >
          <span>💾 Backup & Khôi Phục</span>
        </button>

        <button
          className="tab-btn"
          style={{ background: '#334155', color: '#f8fafc', border: '1px solid #475569' }}
          onClick={onOpenGuide}
        >
          <span>HD Token</span>
        </button>
      </nav>
    </header>
  );
}
