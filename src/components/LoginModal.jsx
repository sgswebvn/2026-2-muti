import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, UserPlus, Mail, Lock, User, AlertCircle, Database, CheckSquare, Square } from 'lucide-react';

export default function LoginModal() {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') !== 'false');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill saved credentials if "Remember Me" was checked previously
  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    const savedPass = localStorage.getItem('remember_password');
    if (savedEmail) setEmail(savedEmail);
    if (savedPass) setPassword(savedPass);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('Vui lòng nhập họ tên.');
          setSubmitting(false);
          return;
        }
        const res = await register(name, email, password);
        if (!res.success) {
          setError(res.error);
        } else {
          handleRememberSave();
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error);
        } else {
          handleRememberSave();
        }
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi hệ thống.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRememberSave = () => {
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
      localStorage.setItem('remember_email', email);
      localStorage.setItem('remember_password', password);
    } else {
      localStorage.setItem('remember_me', 'false');
      localStorage.removeItem('remember_email');
      localStorage.removeItem('remember_password');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(7, 10, 19, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="glass-card shadow-glow animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1877f2, #3b82f6)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(24, 119, 242, 0.4)',
              marginBottom: '16px'
            }}
          >
            <ShieldCheck size={36} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
            Facebook Multi-Publisher
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Database size={14} color="#10b981" /> MongoDB Cloud Multi-User System
          </p>
        </div>

        {/* Tab Toggle */}
        <div 
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '24px'
          }}
        >
          <button
            type="button"
            onClick={() => { setIsRegisterMode(false); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: !isRegisterMode ? '#1877f2' : 'transparent',
              color: !isRegisterMode ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogIn size={16} /> Đăng Nhập
          </button>

          <button
            type="button"
            onClick={() => { setIsRegisterMode(true); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: isRegisterMode ? '#1877f2' : 'transparent',
              color: isRegisterMode ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={16} /> Đăng Ký
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegisterMode && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 500 }}>
                Họ và Tên
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegisterMode}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 500 }}>
              Địa chỉ Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 500 }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div 
            onClick={() => setRememberMe(!rememberMe)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              userSelect: 'none',
              marginTop: '-4px'
            }}
          >
            {rememberMe ? (
              <CheckSquare size={18} color="#3b82f6" />
            ) : (
              <Square size={18} color="#64748b" />
            )}
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Nhớ mật khẩu và tài khoản đăng nhập
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '8px',
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #1877f2, #2563eb)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(24, 119, 242, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {submitting ? 'Đang xử lý...' : (isRegisterMode ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập Vào Dashboard')}
          </button>
        </form>
      </div>
    </div>
  );
}
