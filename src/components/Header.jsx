import React from 'react';
import { Facebook, Users, FileText, Settings, BookOpen } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, accountCount, onOpenGuide }) {
  return (
    <header className="glass-card app-header">
      <div className="brand">
        <div className="brand-icon">
          <Facebook size={26} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">Facebook Multi-Publisher</h1>
          <p className="brand-subtitle">Đăng Bài & Reels Tự Động Cho Nhiều Fanpage Facebook</p>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <FileText size={18} />
          <span>Đăng Bài Fanpage</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <Users size={18} />
          <span>Quản Lý Fanpage ({accountCount})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Settings size={18} />
          <span>Lịch Sử Bài Đăng</span>
        </button>

        <button
          className="tab-btn"
          style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}
          onClick={onOpenGuide}
        >
          <BookOpen size={18} />
          <span>HD Đăng Ký Token</span>
        </button>
      </nav>
    </header>
  );
}
