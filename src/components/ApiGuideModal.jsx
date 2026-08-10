import React from 'react';
import { X, ExternalLink, Key, CheckCircle, Users, Cpu, Sparkles } from 'lucide-react';

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
        background: 'rgba(0, 0, 0, 0.85)',
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
          maxWidth: '820px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa' }}>
            <Key color="#1877f2" /> Hướng Dẫn Lấy API Keys & Access Token
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
          
          {/* STEP 1: GROK API KEY GUIDE */}
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#c084fc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#c084fc" /> Hướng Dẫn Lấy Key API xAI Super Grok (Phân Tích Video & Tạo Content)
            </h3>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Truy cập Cổng Quản Lý Dev của xAI: <a href="https://console.x.ai/" target="_blank" rel="noreferrer" style={{ color: '#c084fc', fontWeight: 'bold' }}>xAI Console (console.x.ai) <ExternalLink size={12} /></a>.</li>
              <li>Đăng nhập bằng tài khoản X (Twitter) hoặc tài khoản xAI của bạn.</li>
              <li>Vào mục <b>API Keys</b> → Nhấp vào nút <b>Create API Key</b>.</li>
              <li>Đặt tên cho API Key và sao chép mã Key có dạng <code>xai-...</code>.</li>
              <li>Dán mã Super Grok API Key vào phần cài đặt trong tab <b>Sáng Tạo AI (ChatGPT/Grok)</b> hoặc mục Cài Đặt.</li>
              <li>⚡ <i>Tính năng đặc biệt:</i> Sau khi nhập Grok API Key, ứng dụng có thể tự động phân tích nội dung tệp Video upload và sinh Tiêu Đề Tiếng Anh (English Title) siêu hấp dẫn!</li>
            </ol>
          </div>

          {/* STEP 2: FACEBOOK GRAPH API EXPLORER */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#1877f2', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>1</span>
              Lấy Access Token Facebook Page Từ Graph API Explorer
            </h3>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Truy cập <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Meta Graph API Explorer <ExternalLink size={12} /></a>.</li>
              <li>Tại mục <b>User or Page</b>: Chọn <code>Get User Access Token</code>.</li>
              <li>Tích chọn 4 quyền cần thiết (Bắt buộc tích <code>pages_manage_engagement</code> để tạo/trả lời bình luận):
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', margin: '8px 0', fontFamily: 'monospace', fontSize: '0.85rem', color: '#38bdf8' }}>
                  pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement
                </div>
              </li>
              <li>Bấm <b>Generate Access Token</b> → Đăng nhập Facebook và cấp quyền.</li>
              <li>Copy đoạn mã Token nhận được và dán vào tab <b>Quản Lý Fanpage</b> trong ứng dụng này!</li>
            </ol>
          </div>

          {/* STEP 3: Share with Team Member */}
          <div style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#facc15', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Cách Chia Sẻ Cho Người Khác Dùng Cùng (Meta Dev App)
            </h3>
            <ol style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-main)' }}>
              <li>Vào trang quản trị App của bạn: <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Meta App Dashboard <ExternalLink size={12} /></a>.</li>
              <li>Vào mục <b>Roles</b> &rarr; Nhấp vào nút <b>Add People</b> ở mục Developers hoặc Testers.</li>
              <li>Nhập ID Facebook của đồng nghiệp và xác nhận để cấp quyền dùng app.</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            <CheckCircle size={16} /> Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
