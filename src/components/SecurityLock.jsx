import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, AlertCircle } from 'lucide-react';

export default function SecurityLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('pinUnlocked', 'true');
        onUnlock();
      } else {
        throw new Error(data.error || 'Mã PIN bảo mật không đúng!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 28px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
        }}
      >
        <div 
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(24, 119, 242, 0.4)'
          }}
        >
          <Lock size={32} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
          Xác Thực Mã Bảo Mật
        </h2>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          Ứng dụng được bảo vệ bằng Mã PIN riêng tư. Vui lòng nhập mã bảo mật để mở khóa công cụ.
        </p>

        {error && (
          <div 
            style={{ 
              padding: '10px 14px', 
              borderRadius: '10px', 
              marginBottom: '20px', 
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <input 
              type="password" 
              className="input-field" 
              style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '6px', padding: '14px' }}
              placeholder="••••••"
              maxLength={12}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Đang kiểm tra...' : '🔓 Mở Khóa Sử Dụng'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.775rem', color: 'var(--text-dim)' }}>
          💡 Mã PIN ban đầu mặc định: <code style={{ color: '#60a5fa', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>123456</code> (Có thể đổi trong Cài đặt).
        </div>
      </div>
    </div>
  );
}
