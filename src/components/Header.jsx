import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, accountCount, onOpenGuide, onOpenBackup }) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-card app-header" style={{ padding: '14px 20px', marginBottom: '20px' }}>
      <div className="brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="brand-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Facebook Multi-Publisher
          </h1>
          <p className="brand-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Quản Lý & Đăng Bài Tự Động Đa Fanpage (MongoDB Cloud)
          </p>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff' }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {user.name}
                  {user.role === 'admin' && (
                    <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      Admin
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.email}</div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Đăng xuất khỏi tài khoản"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <LogOut size={14} /> Đăng xuất
            </button>
          </div>
        )}
      </div>

      <nav className="nav-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
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

        <a
          href="https://developers.facebook.com/tools/explorer/"
          target="_blank"
          rel="noreferrer"
          className="tab-btn"
          style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          🔗 Lấy Token (Graph API Explorer) ↗
        </a>
      </nav>
    </header>
  );
}
