import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          style={{ 
            minHeight: '100vh', 
            background: '#0f172a', 
            color: '#f8fafc', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <div 
            style={{ 
              maxWidth: '550px', 
              background: '#1e293b', 
              border: '1px solid #ef4444', 
              borderRadius: '16px', 
              padding: '32px', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)' 
            }}
          >
            <h2 style={{ fontSize: '1.4rem', color: '#ef4444', marginBottom: '12px', fontWeight: 700 }}>
              ⚠️ Giao Diện Đã Tự Động Phục Hồi
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.925rem', marginBottom: '20px', lineHeight: '1.6' }}>
              Trình duyệt của bạn đang tải phiên bản lưu tạm cũ. Vui lòng nhấp vào nút bên dưới để tải lại dữ liệu mới nhất.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                localStorage.removeItem('activeTab');
                window.location.reload(true);
              }}
              style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 Tải Lại Trang (Reload App)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
