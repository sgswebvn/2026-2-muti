import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AccountManager from './components/AccountManager';
import PostPublisher from './components/PostPublisher';
import PostHistory from './components/PostHistory';
import ApiGuideModal from './components/ApiGuideModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('publish');
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        accountCount={accounts.length}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Active Tab View */}
      <main>
        {activeTab === 'publish' && (
          <PostPublisher 
            accounts={accounts} 
            onPostCreated={() => {
              fetchPosts();
              setActiveTab('history');
            }} 
          />
        )}

        {activeTab === 'accounts' && (
          <AccountManager 
            accounts={accounts} 
            fetchAccounts={fetchAccounts} 
            onOpenGuide={() => setIsGuideOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <PostHistory 
            posts={posts} 
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
