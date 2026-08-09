import React from 'react';
import { X, ExternalLink, Key, CheckCircle, ShieldCheck, FileText } from 'lucide-react';

export default function ApiGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
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
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa' }}>
            <Key color="#1877f2" /> Hướng Dẫn Chi Tiết Đăng Ký Meta API (Nội Bộ)
          </h2>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.925rem', lineHeight: '1.6' }}>
          
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '14px 18px', borderRadius: '12px', borderLeft: '4px solid #1877f2' }}>
            💡 <b>Lưu ý quan trọng:</b> Vì công cụ này bạn chạy <b>Nội bộ cá nhân</b>, ứng dụng Meta của bạn chỉ cần đặt ở chế độ <b>Development Mode</b>. Bạn không cần nộp hồ sơ App Review hay tạo công ty!
          </div>

          {/* STEP 1 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#1877f2', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>1</span>
              Tạo App Trên Meta Developers
            </h3>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Truy cập trang <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Meta for Developers <ExternalLink size={12} /></a> và đăng nhập bằng tài khoản Facebook của bạn.</li>
              <li>Bấm vào <b>My Apps</b> (Ứng dụng của tôi) → Chọn <b>Create App</b> (Tạo ứng dụng).</li>
              <li>Chọn mục tiêu: Chọn <b>Other</b> → Chọn loại <b>Business</b>.</li>
              <li>Đặt tên App (Ví dụ: <code>My Local Publisher</code>) và hoàn tất tạo App.</li>
              <li>Vào <b>Settings → Basic</b> để lấy <b>App ID</b> và <b>App Secret</b> dán vào công cụ này.</li>
            </ol>
          </div>

          {/* STEP 2 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#f472b6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#e1306c', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>2</span>
              Thêm Sản Phẩm (Products) Cần Thiết
            </h3>
            <p style={{ marginBottom: '8px' }}>Tại bảng điều khiển Dashboard của App vừa tạo, nhấn bấm nút <b>Set Up</b> các sản phẩm sau:</p>
            <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>✅ <b>Facebook Login for Business</b></li>
              <li>✅ <b>Instagram Graph API</b></li>
              <li>✅ <b>Threads API</b></li>
            </ul>
          </div>

          {/* STEP 3 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#4ade80', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#22c55e', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>3</span>
              Lấy Token từ Meta Graph API Explorer
            </h3>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Truy cập công cụ <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Meta Graph API Explorer <ExternalLink size={12} /></a>.</li>
              <li>Tại mục <b>Meta App</b> góc phải: Chọn đúng tên App bạn vừa tạo ở Bước 1.</li>
              <li>Tại mục <b>User or Page</b>: Chọn <code>Get User Access Token</code>.</li>
              <li>Tích chọn các quyền permissions sau:
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', margin: '8px 0', fontFamily: 'monospace', fontSize: '0.825rem', color: '#38bdf8' }}>
                  pages_show_list, pages_read_engagement, pages_manage_posts, <br/>
                  instagram_basic, instagram_content_publish, <br/>
                  threads_basic, threads_content_publish
                </div>
              </li>
              <li>Nhấn <b>Generate Access Token</b> và chấp nhận cấp quyền Facebook.</li>
              <li>Copy toàn bộ mã Token nhận được dán vào ô <b>Access Token</b> trong công cụ của chúng ta!</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            <CheckCircle size={16} /> Đã Hiểu & Đóng Hướng Dẫn
          </button>
        </div>
      </div>
    </div>
  );
}
