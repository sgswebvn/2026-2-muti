import React, { useState } from 'react';
import { Download, Upload, Database, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function BackupModal({ isOpen, onClose, onBackupRestored }) {
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState(null);

  if (!isOpen) return null;

  // Handle Export Backup JSON download
  const handleExportBackup = () => {
    window.open('/api/backup/export', '_blank');
    setNotice({
      type: 'success',
      text: '🎉 Đã tải file sao lưu dữ liệu (Export Backup JSON) thành công về máy tính!'
    });
  };

  // Handle Import Backup File
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setNotice(null);

    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupJson)
      });

      const data = await res.json();
      if (data.success) {
        setNotice({
          type: 'success',
          text: `🎉 ${data.message || 'Đã khôi phục dữ liệu sao lưu thành công!'}`
        });
        if (onBackupRestored) {
          setTimeout(() => {
            onBackupRestored();
          }, 1200);
        }
      } else {
        throw new Error(data.error || 'Khôi phục sao lưu thất bại.');
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: `Lỗi nhập sao lưu: ${err.message}`
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
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
          maxWidth: '650px',
          padding: '28px',
          background: '#0b1329',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: 700 }}>
            <Database color="#3b82f6" /> Sao Lưu & Khôi Phục Dữ Liệu (Backup Data)
          </h2>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notice alert */}
        {notice && (
          <div className={`alert alert-${notice.type}`} style={{ marginBottom: '16px', padding: '12px 16px', fontSize: '0.875rem' }}>
            <span>{notice.text}</span>
          </div>
        )}

        {/* Content Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* EXPORT OPTION */}
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} /> 1. Tải Về Bản Sao Lưu Dữ Liệu (Export Backup JSON)
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Xuất toàn bộ danh sách Fanpage, mã Token, bài viết đã lên lịch và cài đặt thành file JSON an toàn về máy tính.
              </p>
            </div>

            <button 
              type="button" 
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.875rem', fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', whiteSpace: 'nowrap' }}
              onClick={handleExportBackup}
            >
              📥 Xuất File JSON (.json)
            </button>
          </div>

          {/* IMPORT OPTION */}
          <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} /> 2. Nhập Bản Sao Lưu Để Khôi Phục (Import Backup JSON)
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Khôi phục lại dữ liệu Fanpage, bài viết và cài đặt từ file sao lưu JSON đã lưu trước đây.
              </p>
            </div>

            <label 
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', background: '#1e293b', border: '1px solid #3b82f6', color: '#60a5fa', whiteSpace: 'nowrap' }}
            >
              {importing ? '⏳ Đang Nạp Dữ Liệu...' : '📤 Chọn File JSON Để Nhập'}
              <input 
                type="file" 
                accept=".json" 
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={importing}
              />
            </label>
          </div>

          {/* Security Note */}
          <div style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.2)', fontSize: '0.8rem', color: '#fde047', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lưu ý bảo mật:</strong> File sao lưu JSON chứa thông tin kết nối các trang Fanpage của bạn. Hãy bảo quản file cẩn thận và không chia sẻ cho người không tin cậy.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            ✕ Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
}
