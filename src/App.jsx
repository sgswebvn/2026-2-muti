import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AccountManager from './components/AccountManager';
import PostPublisher from './components/PostPublisher';
import AiContentGenerator from './components/AiContentGenerator';
import PostHistory from './components/PostHistory';
import ApiGuideModal from './components/ApiGuideModal';
import BackupModal from './components/BackupModal';

const VALID_TABS = ['dashboard', 'publish', 'ai', 'accounts', 'history'];

export default function App() {
  // Persist activeTab in localStorage so F5 reload stays on current page
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeTab');
    return VALID_TABS.includes(saved) ? saved : 'dashboard';
  });

  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [draftFromAi, setDraftFromAi] = useState(null);

  const currentTab = VALID_TABS.includes(activeTab) ? activeTab : 'dashboard';

  const changeTab = (tab) => {
    const valid = VALID_TABS.includes(tab) ? tab : 'dashboard';
    setActiveTab(valid);
    localStorage.setItem('activeTab', valid);
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

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header 
        activeTab={currentTab} 
        setActiveTab={changeTab} 
        accountCount={accounts.length}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
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
            onOpenGuide={() => setIsGuideOpen(true)}
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
            onOpenGuide={() => setIsGuideOpen(true)}
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

      {/* Meta API Interactive Guide Modal */}
      <ApiGuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
      />

      {/* Data Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onBackupRestored={() => {
          fetchAccounts();
          fetchPosts();
          setIsBackupOpen(false);
        }}
      />
    </div>
  );
}
