import React, { useState, useEffect } from 'react';

export default function AccountManager({ accounts, fetchAccounts, onOpenGuide }) {
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

  // Role invite modal state
  const [selectedPageForRole, setSelectedPageForRole] = useState(null);
  const [userEmailOrId, setUserEmailOrId] = useState('');
  const [roleInput, setRoleInput] = useState('CREATE_CONTENT');
  const [invitingRole, setInvitingRole] = useState(false);

  // Group editing state
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

  // Connect Token Helper
  const connectTokenToBackend = async (tokenStr) => {
    setLoading(true);
    setMessage(null);

    try {
      if (appId || appSecret || openaiApiKey) {
        await saveSettings();
      }

      const res = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenStr.trim() })
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

  const handleConnectToken = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    connectTokenToBackend(tokenInput);
  };

  // FB SDK Dynamic Loader & OAuth Login
  const handleFbOAuthLogin = () => {
    setLoading(true);
    setMessage(null);

    const targetAppId = appId.trim() || '1062583589573156';

    const initAndLogin = () => {
      if (!window.FB) {
        setLoading(false);
        setMessage({ type: 'error', text: 'Không thể tải SDK Facebook. Vui lòng kiểm tra kết nối mạng.' });
        return;
      }

      window.FB.init({
        appId: targetAppId,
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      });

      window.FB.login((response) => {
        if (response.authResponse && response.authResponse.accessToken) {
          connectTokenToBackend(response.authResponse.accessToken);
        } else {
          setLoading(false);
          setMessage({ type: 'error', text: 'Đăng nhập Facebook bị hủy hoặc không thành công.' });
        }
      }, { scope: 'pages_show_list,pages_manage_posts,pages_read_engagement' });
    };

    if (window.FB) {
      initAndLogin();
    } else {
      window.fbAsyncInit = initAndLogin;
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
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
        body: JSON.stringify({ group: newGroup })
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

      {/* Grid: OAuth Login & Manual Token Connector */}
      <div className="grid-2">
        {/* 1. Facebook OAuth 2.0 & Token Input Form */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', fontWeight: 700 }}>
            Kết Nối Tài Khoản Facebook & Fanpages
          </h3>

          {/* Facebook OAuth Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              className="btn"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1877f2',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '8px'
              }}
              onClick={handleFbOAuthLogin}
              disabled={loading}
            >
              {loading ? 'Đang Xử Lý Kết Nối Facebook...' : 'Đăng Nhập Bằng Facebook (Cách 2)'}
            </button>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
              Bấm nút trên để đăng nhập tài khoản Facebook thường và kết nối tự động toàn bộ Fanpage.
            </div>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <form onSubmit={handleConnectToken}>
              <div className="form-group">
                <label className="form-label">Hoặc dán Access Token thủ công (Dành cho Dev)</label>
                <textarea
                  className="textarea-field"
                  style={{ minHeight: '80px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  placeholder="Dán mã EAAPGagVmkiQ..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '10px' }} disabled={loading}>
                {loading ? 'Đang quét...' : 'Kết Nối Bằng Access Token'}
              </button>
            </form>
          </div>
        </div>

        {/* 2. Meta App & OpenAI Credentials */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cấu Hình Hệ Thống & OpenAI Key</h3>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={onOpenGuide}>
              Hướng Dẫn
            </button>
          </div>

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

        {filteredAccounts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Không tìm thấy Fanpage nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredAccounts.map((acc) => {
              const isInvalid = acc.tokenStatus === 'invalid' || acc.tokenStatus === 'expired';
              const currentGroup = acc.group || 'Mặc định';

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
                    background: '#0f172a',
                    border: '1px solid #334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {acc.avatar ? (
                      <img 
                        src={acc.avatar} 
                        alt={acc.name} 
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} 
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
                        {/* Group Tag Badge */}
                        <span 
                          onClick={() => {
                            setEditingGroupAcc(acc);
                            setGroupInput(currentGroup);
                          }}
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            background: '#334155', 
                            color: '#94a3b8', 
                            border: '1px solid #475569',
                            cursor: 'pointer' 
                          }}
                          title="Bấm để đổi nhóm"
                        >
                          Nhóm: {currentGroup}
                        </span>

                        {isInvalid ? (
                          <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>Lỗi Token</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600 }}>Token Hoạt Động</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => setSelectedPageForRole(acc)}
                    >
                      Mời Role Fanpage
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

      {/* EDIT GROUP MODAL */}
      {editingGroupAcc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Phân Nhóm Cho Fanpage: {editingGroupAcc.name}
            </h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Tên Nhóm (VD: Bán Hàng, Bất Động Sản, Thời Trang)</label>
              <input 
                type="text" 
                className="input-field" 
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="Nhập tên nhóm..."
              />
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
