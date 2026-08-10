import React, { useState, useEffect } from 'react';
import LiveCommentManager from './LiveCommentManager';

export default function AccountManager({ accounts, fetchAccounts, posts = [], fetchPosts, onOpenGuide }) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingTokens, setCheckingTokens] = useState(false);
  const [message, setMessage] = useState(null);

  // Search & Group Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // Selected accounts for bulk group assignment
  const [selectedAccIds, setSelectedAccIds] = useState([]);
  const [bulkGroupName, setBulkGroupName] = useState('');

  // Single Fanpage Management Modal state
  const [managingPage, setManagingPage] = useState(null);
  const [singlePostTitle, setSinglePostTitle] = useState('');
  const [singlePostCaption, setSinglePostCaption] = useState('');
  const [singlePostComments, setSinglePostComments] = useState('');
  const [publishingSingle, setPublishingSingle] = useState(false);

  // Live comment manager active post state
  const [activePostForComments, setActivePostForComments] = useState(null);

  // Role invite modal state
  const [selectedPageForRole, setSelectedPageForRole] = useState(null);
  const [userEmailOrId, setUserEmailOrId] = useState('');
  const [roleInput, setRoleInput] = useState('CREATE_CONTENT');
  const [invitingRole, setInvitingRole] = useState(false);

  // Group editing modal state
  const [editingGroupAcc, setEditingGroupAcc] = useState(null);
  const [groupInput, setGroupInput] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setAppId(data.settings.appId || '');
        setAppSecret(data.settings.appSecret || '');
        setOpenaiApiKey(data.settings.openaiApiKey || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, appSecret, openaiApiKey })
      });
      setMessage({ type: 'success', text: 'Đã lưu cấu hình App & OpenAI API Key thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể lưu cài đặt.' });
    }
  };

  const handleConnectToken = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      if (appId || appSecret || openaiApiKey) {
        await saveSettings();
      }

      const res = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Lỗi khi kết nối Access Token');
      }

      setTokenInput('');
      fetchAccounts();
      setMessage({
        type: 'success',
        text: `Tải thành công ${data.addedCount} Fanpage Facebook! Danh sách đã được cập nhật.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTokens = async () => {
    setCheckingTokens(true);
    setMessage(null);
    try {
      const res = await fetch('/api/accounts/check-tokens', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
        setMessage({ type: 'success', text: 'Đã hoàn tất kiểm tra sức khỏe Access Token của tất cả các Fanpage!' });
      } else {
        throw new Error(data.error || 'Không thể kiểm tra token');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setCheckingTokens(false);
    }
  };

  const handleSaveAccountGroup = async (accId, newGroup) => {
    try {
      const res = await fetch(`/api/accounts/facebook/${accId}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: newGroup.trim() || 'Mặc định' })
      });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
        setEditingGroupAcc(null);
      }
    } catch (err) {
      alert('Không thể cập nhật nhóm Fanpage.');
    }
  };

  // Bulk Group Assignment
  const handleBulkAssignGroup = async (e) => {
    e.preventDefault();
    if (selectedAccIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 Fanpage bên dưới để gán nhóm.');
      return;
    }
    if (!bulkGroupName.trim()) {
      alert('Vui lòng nhập tên nhóm mới.');
      return;
    }

    try {
      for (const accId of selectedAccIds) {
        await fetch(`/api/accounts/facebook/${accId}/group`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group: bulkGroupName.trim() })
        });
      }
      fetchAccounts();
      setSelectedAccIds([]);
      setBulkGroupName('');
      setMessage({ type: 'success', text: `Đã tạo nhóm "${bulkGroupName.trim()}" và gán thành công cho ${selectedAccIds.length} Fanpage!` });
    } catch (err) {
      alert('Không thể gán nhóm hàng loạt.');
    }
  };

  // Quick Post for Single Fanpage Modal
  const handlePublishSinglePagePost = async (e) => {
    e.preventDefault();
    if (!managingPage || !singlePostCaption.trim()) return;

    setPublishingSingle(true);
    try {
      const payload = {
        title: singlePostTitle,
        caption: singlePostCaption,
        firstComment: singlePostComments,
        platforms: ['facebook'],
        targetAccountIds: [managingPage.id],
        publishNow: true
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert(`Đã đăng bài viết lên Fanpage ${managingPage.name} thành công!`);
        setSinglePostTitle('');
        setSinglePostCaption('');
        setSinglePostComments('');
        if (fetchPosts) fetchPosts();
      } else {
        throw new Error(data.error || 'Thao tác thất bại');
      }
    } catch (err) {
      alert(`Lỗi đăng bài: ${err.message}`);
    } finally {
      setPublishingSingle(false);
    }
  };

  const toggleAccSelection = (id) => {
    if (selectedAccIds.includes(id)) {
      setSelectedAccIds(selectedAccIds.filter(i => i !== id));
    } else {
      setSelectedAccIds([...selectedAccIds, id]);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa Fanpage này khỏi ứng dụng?`)) return;

    try {
      const res = await fetch(`/api/accounts/facebook/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
      }
    } catch (err) {
      alert('Không thể xóa tài khoản');
    }
  };

  const handleInviteRole = async (e) => {
    e.preventDefault();
    if (!selectedPageForRole || !userEmailOrId.trim()) return;

    setInvitingRole(true);
    try {
      const res = await fetch(`/api/accounts/${selectedPageForRole.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: userEmailOrId.trim(), role: roleInput })
      });
      const data = await res.json();
      if (data.success) {
        alert('Đã gửi lời mời phân quyền thành công!');
        setSelectedPageForRole(null);
        setUserEmailOrId('');
      } else {
        throw new Error(data.error || 'Lỗi gửi lời mời');
      }
    } catch (err) {
      alert(`Lỗi mời vai trò: ${err.message}`);
    } finally {
      setInvitingRole(false);
    }
  };

  const fbAccounts = accounts.filter(a => a.platform === 'facebook');

  // Unique groups list
  const groupsList = Array.from(new Set(fbAccounts.map(a => a.group || 'Mặc định')));

  // Filtered accounts by search and group
  const filteredAccounts = fbAccounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || acc.id.includes(searchQuery);
    const matchesGroup = selectedGroupFilter === 'ALL' || (acc.group || 'Mặc định') === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  // Filter posts belonging to managingPage
  const pagePosts = managingPage ? posts.filter(p => {
    const isTargeted = p.targetAccountIds && p.targetAccountIds.includes(managingPage.id);
    const hasResult = p.results && (p.results[`facebook_${managingPage.id}`] || p.results[managingPage.id]);
    return isTargeted || hasResult;
  }) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Message */}
      {message && (
        <div 
          className="glass-card" 
          style={{
            padding: '12px 18px',
            borderColor: message.type === 'success' ? '#22c55e' : '#ef4444',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            fontSize: '0.875rem'
          }}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Token Connector & App Credentials */}
      <div className="grid-2">
        {/* 1. Access Token Input Form */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Kết Nối Access Token Fanpage
            </h3>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={onOpenGuide}>
              HD Lấy Token
            </button>
          </div>

          <form onSubmit={handleConnectToken}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Access Token (Dán token từ Graph API Explorer)</label>
              <textarea
                className="textarea-field"
                style={{ minHeight: '100px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                placeholder="Dán mã EAAPGagVmkiQ... vào đây"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Đang quét Fanpage...' : 'Kết Nối & Quét Danh Sách Fanpage'}
            </button>
          </form>
        </div>

        {/* 2. Meta App & OpenAI Credentials */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Cấu Hình Hệ Thống & OpenAI Key</h3>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label">OpenAI API Key (Tích hợp ChatGPT Content)</label>
            <input
              type="password"
              className="input-field"
              placeholder="sk-proj-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Meta App ID</label>
              <input
                type="text"
                className="input-field"
                placeholder="106258358..."
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Meta App Secret</label>
              <input
                type="password"
                className="input-field"
                placeholder="App Secret..."
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={saveSettings}>
            Lưu Cấu Hình
          </button>
        </div>
      </div>

      {/* Visual Connected Facebook Pages List with Grouping & Search */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            Quản Lý Danh Sách Fanpage ({fbAccounts.length})
          </h3>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <input 
              type="text" 
              className="input-field" 
              placeholder="Tìm theo tên hoặc ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '180px', fontSize: '0.85rem', padding: '6px 12px' }}
            />

            {/* Group Filter */}
            <select 
              className="input-field"
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              style={{ width: '160px', fontSize: '0.85rem', padding: '6px 12px' }}
            >
              <option value="ALL">Tất cả nhóm ({fbAccounts.length})</option>
              {groupsList.map(grp => (
                <option key={grp} value={grp}>Nhóm: {grp}</option>
              ))}
            </select>

            <button 
              className="btn btn-secondary" 
              onClick={handleCheckTokens}
              disabled={checkingTokens}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              {checkingTokens ? 'Đang Kiểm Tra...' : 'Kiểm Tra Token'}
            </button>
          </div>
        </div>

        {/* BULK CREATE & ASSIGN GROUP BAR */}
        <form 
          onSubmit={handleBulkAssignGroup}
          style={{ 
            background: '#0f172a', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            border: '1px solid #334155',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '160px' }}>
            Tạo Nhóm Mới ({selectedAccIds.length} Trang được chọn):
          </div>

          <input 
            type="text" 
            className="input-field" 
            placeholder="Nhập tên nhóm mới (VD: Bán Hàng, Thời Trang, Bất Động Sản)..."
            value={bulkGroupName}
            onChange={(e) => setBulkGroupName(e.target.value)}
            style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem', padding: '6px 12px' }}
          />

          <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            + Tạo & Gán Nhóm Cho Các Trang Đã Chọn
          </button>
        </form>

        {filteredAccounts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Không tìm thấy Fanpage nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredAccounts.map((acc) => {
              const isInvalid = acc.tokenStatus === 'invalid' || acc.tokenStatus === 'expired';
              const currentGroup = acc.group || 'Mặc định';
              const isChecked = selectedAccIds.includes(acc.id);

              return (
                <div 
                  key={acc.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: isChecked ? 'rgba(37, 99, 235, 0.15)' : '#0f172a',
                    border: isChecked ? '2px solid #2563eb' : '1px solid #334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleAccSelection(acc.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />

                    {acc.avatar ? (
                      <img 
                        src={acc.avatar} 
                        alt={acc.name} 
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div className="avatar-placeholder">{acc.name.substring(0, 2).toUpperCase()}</div>
                    )}

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {acc.name}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        {/* Group Tag Badge - Click to edit */}
                        <span 
                          onClick={() => {
                            setEditingGroupAcc(acc);
                            setGroupInput(currentGroup);
                          }}
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            background: '#2563eb', 
                            color: '#ffffff', 
                            fontWeight: 600,
                            cursor: 'pointer' 
                          }}
                          title="Bấm vào để đổi nhóm cho trang này"
                        >
                          Nhóm: {currentGroup} ✎
                        </span>

                        {isInvalid ? (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>Lỗi Token</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600 }}>Hoạt Động</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.75rem', padding: '4px 8px', fontWeight: 600 }}
                      onClick={() => setManagingPage(acc)}
                    >
                      Quản Lý Trang Này
                    </button>

                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => setSelectedPageForRole(acc)}
                    >
                      Role
                    </button>

                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => handleDeleteAccount(acc.id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SINGLE FANPAGE MANAGEMENT MODAL */}
      {managingPage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#1e293b' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {managingPage.avatar && <img src={managingPage.avatar} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />}
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Trang: {managingPage.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {managingPage.id} · Nhóm: {managingPage.group || 'Mặc định'}</div>
                </div>
              </div>

              <button className="btn btn-secondary" onClick={() => setManagingPage(null)}>Đóng</button>
            </div>

            {/* Grid 2: Quick Publisher & Page Post History */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
              {/* Quick Post Box */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>Soạn Bài Đăng Nhanh</h4>

                <form onSubmit={handlePublishSinglePagePost}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Tiêu đề (Tùy chọn)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Nhập tiêu đề..."
                      value={singlePostTitle}
                      onChange={(e) => setSinglePostTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Nội dung bài viết (*)</label>
                    <textarea 
                      className="input-field" 
                      rows={4}
                      placeholder="Nhập nội dung bài viết..."
                      value={singlePostCaption}
                      onChange={(e) => setSinglePostCaption(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Bình luận seeding tự động (Mỗi câu 1 dòng)</label>
                    <textarea 
                      className="textarea-field" 
                      rows={2}
                      placeholder="Nhập bình luận seeding..."
                      value={singlePostComments}
                      onChange={(e) => setSinglePostComments(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={publishingSingle}>
                    {publishingSingle ? 'Đang xuất bản...' : 'Đăng Bài Ngay Lên Trang Này'}
                  </button>
                </form>
              </div>

              {/* Page Post History */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', maxHeight: '420px', overflowY: 'auto' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
                  Lịch Sử Bài Đăng Trang Này ({pagePosts.length})
                </h4>

                {pagePosts.length === 0 ? (
                  <div style={{ fontSize: '0.825rem', color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
                    Chưa có bài viết nào đăng riêng lên trang này.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {pagePosts.map(p => {
                      const pageResult = p.results ? (p.results[`facebook_${managingPage.id}`] || p.results[managingPage.id]) : null;
                      return (
                        <div key={p.id} style={{ padding: '10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                            {p.title || p.caption?.substring(0, 50)}...
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginBottom: '6px' }}>
                            {new Date(p.createdAt).toLocaleString('vi-VN')}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ fontSize: '0.725rem', padding: '3px 8px' }}
                              onClick={() => setActivePostForComments(p)}
                            >
                              💬 Quản Lý & Rep Bình Luận Trực Tiếp
                            </button>

                            {pageResult && pageResult.postUrl && (
                              <a href={pageResult.postUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none', fontSize: '0.725rem' }}>
                                Xem Bài Đăng ↗
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE INTERACTIVE COMMENTS & REPLY MANAGER MODAL */}
      {activePostForComments && managingPage && (
        <LiveCommentManager 
          pageAccount={managingPage}
          post={activePostForComments}
          onClose={() => setActivePostForComments(null)}
        />
      )}

      {/* EDIT GROUP MODAL WITH QUICK TOPIC SUGGESTIONS */}
      {editingGroupAcc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Gán Nhóm Cho Fanpage: {editingGroupAcc.name}
            </h3>
            
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Tên Nhóm Chủ Đề</label>
              <input 
                type="text" 
                className="input-field" 
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="Nhập tên nhóm mới (VD: Nhóm VIP, Mỹ Phẩm)..."
              />
            </div>

            {/* Quick Suggestions */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>Gợi ý tên nhóm:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Thời Trang', 'Bất Động Sản', 'Ẩm Thực', 'Công Nghệ', 'Mỹ Phẩm', 'Bán Hàng', 'Dự Án HN'].map(topic => (
                  <button
                    key={topic}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                    onClick={() => setGroupInput(topic)}
                  >
                    + {topic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditingGroupAcc(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => handleSaveAccountGroup(editingGroupAcc.id, groupInput)}>Lưu Nhóm</button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE ROLE MODAL */}
      {selectedPageForRole && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Mời Phân Quyền Vai Trò Fanpage
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Fanpage: <strong>{selectedPageForRole.name}</strong>
            </div>

            <form onSubmit={handleInviteRole}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Facebook User ID / Email Nguời Nhận</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Nhập ID Facebook hoặc Email..."
                  value={userEmailOrId}
                  onChange={(e) => setUserEmailOrId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Vai Trò (Role Permission)</label>
                <select 
                  className="input-field"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                >
                  <option value="CREATE_CONTENT">Người tạo nội dung (Content Creator / Editor)</option>
                  <option value="MODERATE_COMMENTS">Người kiểm duyệt (Moderator)</option>
                  <option value="EDIT_PROFILE">Quản trị viên trang (Page Administer)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPageForRole(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={invitingRole}>
                  {invitingRole ? 'Đang gửi...' : 'Gửi Lời Mời Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
