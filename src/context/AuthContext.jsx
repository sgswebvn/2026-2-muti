import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Wrap Response.prototype.json to safely handle HTML responses when expecting JSON
const originalJson = Response.prototype.json;
Response.prototype.json = async function () {
  const contentType = this.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    await this.text();
    throw new Error(`Máy chủ trả về trang HTML (Mã HTTP ${this.status}). Vui lòng kiểm tra kết nối API.`);
  }
  try {
    return await originalJson.apply(this);
  } catch (err) {
    if (err.message && err.message.includes('Unexpected token')) {
      throw new Error(`Dữ liệu phản hồi từ máy chủ không đúng định dạng JSON (Mã HTTP ${this.status}).`);
    }
    throw err;
  }
};

// Patch global window.fetch once so all components automatically include Authorization JWT header
const originalFetch = window.fetch;
window.fetch = async function (resource, config = {}) {
  const token = localStorage.getItem('token');
  if (token && typeof resource === 'string' && resource.startsWith('/api/')) {
    config = config || {};
    const headers = new Headers(config.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
  }
  return originalFetch(resource, config);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async (authToken) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Lỗi xác thực người dùng:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Đăng nhập không thành công' };
    }
  };

  const register = async (name, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Đăng ký không thành công' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
