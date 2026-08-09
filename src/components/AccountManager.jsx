import React, { useState, useEffect } from 'react';
import { Key, Facebook, Trash2, CheckCircle2, ShieldAlert, RefreshCw, HelpCircle, ExternalLink } from 'lucide-react';

export default function AccountManager({ accounts, fetchAccounts, onOpenGuide }) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
        body: JSON.stringify({ appId, appSecret })
      });
      setMessage({ type: 'success', text: 'Đã lưu App ID & App Secret thành công!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể lưu cài đặt App.' });
    }
  };

  const handleConnectToken = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      if (appId || appSecret) {
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

  const fbAccounts = accounts.filter(a => a.platform === 'facebook');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Message */}
      {message && (
        <div 
          className="glass-card" 
          style={{
            padding: '16px 20px',
            borderColor: message.type === 'success' ? '#22c55e' : '#ef4444',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {message.type === 'success' ? <CheckCircle2 color="#22c55e" /> : <ShieldAlert color="#ef4444" />}
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{message.text}</span>
        </div>
      )}

      {/* Grid: App Credentials & Token Connector */}
      <div className="grid-2">
        {/* 1. Token Input Form */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Facebook size={20} color="#1877f2" />
            Kết Nối Access Token Fanpage
          </h3>

          <form onSubmit={handleConnectToken}>
            <div className="form-group">
              <label className="form-label">Access Token (Dán token lấy từ Graph API Explorer)</label>
              <textarea
                className="textarea-field"
                style={{ minHeight: '110px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                placeholder="Dán mã EAAPGagVmkiQ..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : null}
              {loading ? 'Đang kiểm tra & quét Fanpage...' : '🚀 Kết Nối & Quét Danh Sách Fanpage'}
            </button>
          </form>
        </div>

        {/* 2. Meta App Credentials */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} color="#1877f2" />
              Meta App Credentials (Tùy chọn)
            </h3>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={onOpenGuide}>
              <HelpCircle size={14} /> Hướng Dẫn
            </button>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Nhập App ID & Secret để ứng dụng tự đổi token 1 giờ thành <b>Long-Lived Token (60 ngày / Vĩnh viễn)</b>.
          </p>

          <div className="form-group">
            <label className="form-label">Meta App ID</label>
            <input
              type="text"
              className="input-field"
              placeholder="1062583589573156"
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

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={saveSettings}>
            Lưu Cấu Hình App
          </button>
        </div>
      </div>

      {/* Connected Facebook Pages List Section */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Facebook color="#1877f2" /> Danh Sách Fanpage Đã Kết Nối ({fbAccounts.length})
        </h3>

        {fbAccounts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <p>Chưa có Fanpage nào. Vui lòng dán Access Token phía trên để tự động nhận diện tất cả Fanpage!</p>
          </div>
        ) : (
          <div className="grid-3">
            {fbAccounts.map((acc) => (
              <div 
                key={acc.id} 
                className="glass-card" 
                style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  background: 'rgba(11, 15, 25, 0.6)'
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

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{acc.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.category || 'Facebook Page'}</span>
                    <div style={{ marginTop: '4px' }}>
                      <a 
                        href={`https://www.facebook.com/${acc.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.725rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
                      >
                        ID: {acc.id} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-danger" 
                  style={{ padding: '8px', borderRadius: '50%' }}
                  onClick={() => handleDeleteAccount(acc.id)}
                  title="Xóa Fanpage này"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
