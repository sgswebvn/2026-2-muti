import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import PostPublisher from './components/PostPublisher';
import AiContentGenerator from './components/AiContentGenerator';
import PostHistory from './components/PostHistory';
import ApiGuideModal from './components/ApiGuideModal';
import SecurityLock from './components/SecurityLock';

export default function App() {
  // Persist activeTab in localStorage so F5 reload stays on current page
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [draftFromAi, setDraftFromAi] = useState(null);

  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('pinUnlocked') === 'true';
  });

  const changeTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  useEffect(() => {
    fetchAccounts();
    fetchPosts();
  }, []);

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

  if (!isUnlocked) {
    return <SecurityLock onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={changeTab} 
        accountCount={accounts.length}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Active Tab View */}
      <main style={{ paddingBottom: '40px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            posts={posts} 
            accounts={accounts} 
            onNavigate={(tab) => changeTab(tab)}
            fetchAccounts={fetchAccounts}
            fetchPosts={fetchPosts}
          />
        )}

        {activeTab === 'publish' && (
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

        {activeTab === 'ai' && (
          <AiContentGenerator 
            accounts={accounts}
            onSendToPublisher={handleSendAiToPublisher}
            onOpenGuide={() => setIsGuideOpen(true)}
            onPostCreated={() => {
              fetchPosts();
              changeTab('history');
            }}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountManager 
            accounts={accounts} 
            fetchAccounts={fetchAccounts} 
            posts={posts}
            fetchPosts={fetchPosts}
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <PostHistory 
            posts={posts} 
            accounts={accounts}
            fetchPosts={fetchPosts} 
          />
        )}
      </main>

      {/* Meta API Interactive Guide Modal */}
      <ApiGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />
    </div>
  );
}
