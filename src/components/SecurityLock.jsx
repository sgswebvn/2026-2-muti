import React, { useState, useEffect } from 'react';
import { Lock, Key, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SecurityLock({ onUnlock }) {
  const [isPinConfigured, setIsPinConfigured] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Verification state
  const [pin, setPin] = useState('');

  // Setup state (for initial configuration)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const res = await fetch('/api/auth/pin-status');
      const data = await res.json();
      if (data.success) {
        setIsPinConfigured(data.isPinConfigured);
      }
    } catch (err) {
      console.error('Lỗi kiểm tra trạng thái PIN:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      setError('Mã PIN bảo mật phải từ 4 đến 12 ký tự.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Mã PIN xác nhận không khớp.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/setup-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: newPin.trim() })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('pinUnlocked', 'true');
        setSuccessMsg('Khởi tạo mã PIN thành công!');
        setTimeout(() => {
          onUnlock();
        }, 800);
      } else {
        throw new Error(data.error || 'Khởi tạo mã PIN thất bại.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
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

  if (checkingStatus) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Đang kiểm tra bảo mật...</div>
      </div>
    );
  }

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
          {isPinConfigured ? <Lock size={32} color="#ffffff" /> : <ShieldCheck size={32} color="#ffffff" />}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
          {isPinConfigured ? 'Xác Thực Mã Bảo Mật' : 'Khởi Tạo Mã PIN Bảo Mật Ban Đầu'}
        </h2>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          {isPinConfigured 
            ? 'Ứng dụng được bảo vệ bằng Mã PIN riêng tư. Vui lòng nhập mã để mở khóa.' 
            : 'Vui lòng thiết lập mã PIN bảo mật cá nhân mới để bảo vệ thông tin tài khoản và token.'}
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

        {successMsg && (
          <div 
            style={{ 
              padding: '10px 14px', 
              borderRadius: '10px', 
              marginBottom: '20px', 
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {!isPinConfigured ? (
          /* INITIAL FIRST-TIME PIN SETUP FORM */
          <form onSubmit={handleSetupPin}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ textAlign: 'left', display: 'block' }}>Nhập Mã PIN Mới (4 - 12 ký tự)</label>
              <input 
                type="password" 
                className="input-field" 
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '6px', padding: '12px' }}
                placeholder="••••••"
                maxLength={12}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ textAlign: 'left', display: 'block' }}>Xác Nhận Mã PIN Mới</label>
              <input 
                type="password" 
                className="input-field" 
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '6px', padding: '12px' }}
                placeholder="••••••"
                maxLength={12}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Đang khởi tạo...' : '🔒 Thiết Lập Mã PIN & Bắt Đầu'}
            </button>
          </form>
        ) : (
          /* NORMAL UNLOCK FORM */
          <form onSubmit={handleVerifyPin}>
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
        )}
      </div>
    </div>
  );
}
