import React from 'react';
import { Share2, Users, FileText, Settings, BookOpen } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, accountCount, onOpenGuide }) {
  return (
    <header className="glass-card app-header">
      <div className="brand">
        <div className="brand-icon">
          <Share2 size={24} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">Meta Cross-Publisher</h1>
          <p className="brand-subtitle">Facebook Page • Instagram Business • Threads</p>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <FileText size={18} />
          <span>Đăng Bài Nhanh</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <Users size={18} />
          <span>Tài Khoản Meta ({accountCount})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Settings size={18} />
          <span>Lịch Sử & Lên Lịch</span>
        </button>

        <button
          className="tab-btn"
          style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}
          onClick={onOpenGuide}
        >
          <BookOpen size={18} />
          <span>HD Đăng Ký API</span>
        </button>
      </nav>
    </header>
  );
}
