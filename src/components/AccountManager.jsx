import React, { useState, useEffect } from 'react';
import { Key, Facebook, Instagram, AtSign, Trash2, CheckCircle2, ShieldAlert, RefreshCw, HelpCircle } from 'lucide-react';

export default function AccountManager({ accounts, fetchAccounts, onOpenGuide }) {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenType, setTokenType] = useState('facebook'); // 'facebook' | 'threads'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch App Settings on mount
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
      // Save settings first
      if (appId || appSecret) {
        await saveSettings();
      }

      const res = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim(), type: tokenType })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Lỗi khi kết nối Access Token');
      }

      setTokenInput('');
      fetchAccounts();
      setMessage({
        type: 'success',
        text: `Đã kết nối thành công ${data.addedCount} tài khoản! Token đã được tự động xử lý.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id, platform) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản này khỏi danh sách?`)) return;

    try {
      const res = await fetch(`/api/accounts/${platform}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
      }
    } catch (err) {
      alert('Không thể xóa tài khoản');
    }
  };

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

      {/* Grid: App Settings & Token Connector */}
      <div className="grid-2">
        {/* 1. App API Credentials (Optional for Long-lived token auto-exchange) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={20} color="#1877f2" />
              Meta App Credentials
            </h3>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={onOpenGuide}>
              <HelpCircle size={14} /> Cách Lấy Token
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            (Tùy chọn) Nhập App ID và App Secret từ Meta Developer Console để hệ thống tự động đổi token 1 giờ thành <b>Long-Lived Token (60 ngày / Vĩnh viễn)</b>.
          </p>

          <div className="form-group">
            <label className="form-label">Meta App ID</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ví dụ: 123456789012345"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meta App Secret</label>
            <input
              type="password"
              className="input-field"
              placeholder="Ví dụ: e4d909c290d..."
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
            />
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={saveSettings}>
            Lưu Cấu Hình App
          </button>
        </div>

        {/* 2. Token Input & Connection Form */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RefreshCw size={20} color="#e1306c" />
            Kết Nối Access Token Nội Bộ
          </h3>

          <form onSubmit={handleConnectToken}>
            <div className="form-group">
              <label className="form-label">Loại Token Connect</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className={`platform-chip facebook ${tokenType === 'facebook' ? 'selected' : ''}`}
                  onClick={() => setTokenType('facebook')}
                  style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                >
                  <Facebook size={18} /> Meta User / Page Token
                </button>
                <button
                  type="button"
                  className={`platform-chip threads ${tokenType === 'threads' ? 'selected' : ''}`}
                  onClick={() => setTokenType('threads')}
                  style={{ flex: 1, padding: '10px', justifyContent: 'center' }}
                >
                  <AtSign size={18} /> Threads Token
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Access Token (Dán token lấy từ Graph Explorer)</label>
              <textarea
                className="textarea-field"
                style={{ minHeight: '90px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                placeholder="EAAXXXXXX..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : null}
              {loading ? 'Đang kiểm tra & tải tài khoản...' : 'Kết Nối Tất Cả Tài Khoản'}
            </button>
          </form>
        </div>
      </div>

      {/* Connected Accounts List Section */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Danh Sách Tài Khoản Đã Kết Nối ({accounts.length})
        </h3>

        {accounts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
            <p>Chưa có tài khoản nào được kết nối. Vui lòng dán Access Token phía trên để tự động nhận diện Facebook Pages, Instagram Accounts & Threads!</p>
          </div>
        ) : (
          <div className="grid-3">
            {accounts.map((acc) => (
              <div 
                key={`${acc.platform}_${acc.id}`} 
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
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div className="avatar-placeholder">{acc.name.substring(0, 2).toUpperCase()}</div>
                  )}

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{acc.name}</h4>
                    <span 
                      className={`platform-chip ${acc.platform} selected`}
                      style={{ fontSize: '0.7rem', padding: '2px 8px', marginTop: '4px' }}
                    >
                      {acc.platform === 'facebook' && <Facebook size={12} />}
                      {acc.platform === 'instagram' && <Instagram size={12} />}
                      {acc.platform === 'threads' && <AtSign size={12} />}
                      {acc.platform.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button 
                  className="btn btn-danger" 
                  style={{ padding: '8px', borderRadius: '50%' }}
                  onClick={() => handleDeleteAccount(acc.id, acc.platform)}
                  title="Xóa tài khoản"
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
