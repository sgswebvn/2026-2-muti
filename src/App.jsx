import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import PostPublisher from './components/PostPublisher';
import AiContentGenerator from './components/AiContentGenerator';
import PostHistory from './components/PostHistory';

const VALID_TABS = ['dashboard', 'publish', 'ai', 'accounts', 'history'];

function MainAppContent() {
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return VALID_TABS.includes(saved) ? saved : 'dashboard';
  });

  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [draftFromAi, setDraftFromAi] = useState(null);

  const currentTab = VALID_TABS.includes(activeTab) ? activeTab : 'dashboard';

  const changeTab = (tab) => {
    const valid = VALID_TABS.includes(tab) ? tab : 'dashboard';
    setActiveTab(valid);
    localStorage.setItem('activeTab', valid);
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchPosts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách tài khoản:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách bài viết:', err);
    }
  };

  const handleSendAiToPublisher = (aiData) => {
    setDraftFromAi(aiData);
    changeTab('publish');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <div>Đang xác thực phiên làm việc...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header 
        activeTab={currentTab} 
        setActiveTab={changeTab} 
        accountCount={accounts.length}
      />

      {/* Main Active Tab View */}
      <main style={{ paddingBottom: '40px' }}>
        {currentTab === 'dashboard' && (
          <Dashboard 
            posts={posts} 
            accounts={accounts} 
            onNavigate={(tab) => changeTab(tab)}
            fetchAccounts={fetchAccounts}
            fetchPosts={fetchPosts}
          />
        )}

        {currentTab === 'publish' && (
          <PostPublisher 
            accounts={accounts} 
            draftFromAi={draftFromAi}
            onClearDraftFromAi={() => setDraftFromAi(null)}
            onPostCreated={() => {
              fetchPosts();
              changeTab('history');
            }} 
          />
        )}

        {currentTab === 'ai' && (
          <AiContentGenerator 
            accounts={accounts}
            onSendToPublisher={handleSendAiToPublisher}
            onPostCreated={() => {
              fetchPosts();
              changeTab('history');
            }}
          />
        )}

        {currentTab === 'accounts' && (
          <AccountManager 
            accounts={accounts} 
            fetchAccounts={fetchAccounts} 
            posts={posts}
            fetchPosts={fetchPosts}
          />
        )}

        {currentTab === 'history' && (
          <PostHistory 
            posts={posts} 
            accounts={accounts}
            fetchPosts={fetchPosts} 
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
