# 📜 Facebook Multi-Publisher All-in-One - Document Lịch Sử Dự Án & Cấu Trúc Hệ Thống

---

## 📌 1. Tổng Quan Dự Án (Project Overview)
- **Tên ứng dụng**: Facebook Multi-Publisher All-in-One System
- **Đường dẫn thư mục nguồn**: `c:\Users\Administrator\Desktop\New folder\2026-2-muti`
- **Địa chỉ khởi chạy cục bộ**: `http://localhost:5000` (Node Express Server + Production Build Assets)
- **Lệnh khởi chạy 1-click**: `npm start` (hoặc double-click tệp `start.bat` trong thư mục gốc)
- **Mục tiêu**: Quản lý đa nền tảng (Facebook Fanpages, Instagram, Threads), tự động phân tích Video bằng AI (Google Gemini 1.5 Flash), sinh các biến thể nội dung độc bản cho 15+ Fanpage cùng lúc, lên lịch đăng bài tự động, quản lý bình luận trực tiếp (Live Comments), và hỗ trợ sao lưu/khôi phục dữ liệu toàn diện.

---

## 🚀 2. Tất Cả Các Tính Năng Đã Hoàn Thành (Key Accomplishments)

### 📹 A. Phân Tích Video AI Multimodal & Sinh Biến Thể Cho Đa Fanpage (`server/services/aiService.js`)
1. **Phân tích Video Multimodal Thực Tế bằng Google Gemini 1.5 Flash**:
   - **HOÀN TOÀN KHÔNG DỰA VÀO TÊN TỆP / ĐUÔI TỆP**: Nạp trực tiếp dữ liệu khung hình (video frames) và âm thanh/giọng nói từ tệp video trong thư mục `uploads/` truyền sang Gemini 1.5 Flash.
   - **Tệp < 20MB**: Dùng `inlineData` base64 để Gemini phân tích trực tiếp.
   - **Tệp ≥ 20MB đến 500MB**: Tải lên qua **Gemini Files API REST Endpoint** (`/upload/v1beta/files`) để AI quét và xem toàn bộ video.
2. **Bộ Làm Sạch & Khôi Phục Font UTF-8 Triệt Để (`server/utils/fontSanitizer.js`)**:
   - **Khắc phục lỗi font Mojibake / Double UTF-8**: Tự động sửa các lỗi chuỗi biến dạng như `Ãª` ➔ `ê`, `á»‘` ➔ `ố`, `Ã¡` ➔ `á`, `Â¦`, `THÃªM`.
   - Ép mã hóa `UTF-8` nguyên vẹn trên cả luồng lưu trữ DB (`db.js`) và khi đăng bài qua Facebook Graph API (`facebookService.js`).
3. **Tối Ưu Sinh Biến Thể Độc Bản Cho Hàng Loạt Fanpage**:
   - Tự động lấy ngay bản phân tích AI ban đầu làm biến thể cho Fanpage thứ 1 (không gọi AI trùng lặp).
   - Khi chọn N Fanpage, Gemini chỉ gọi API sinh biến thể cho (N - 1) Fanpage còn lại (nếu chọn 1 Fanpage sẽ không tiêu tốn thêm bất kỳ lượt gọi AI nào).
4. **Bộ Định Dạng Unicode Font Đa Dạng (`src/utils/unicodeFont.js`)**:
   - Hỗ trợ đổi font chữ Facebook thành Bold (đậm), Italic (nghiêng), Cursive (chữ viết tay), Gothic, Monospace giúp bài đăng nổi bật trên Feeds.

### 🌐 B. Đa Nền Tảng & Tunnel Tự Động (Meta Platforms & Localtunnel)
1. **Hỗ trợ Facebook Fanpages, Instagram Business & Threads Profile**:
   - Tích hợp Graph API cho Facebook (`facebookService.js`), Instagram (`instagramService.js`) và Threads (`threadsService.js`).
2. **Hệ Thống Public Tunnel Tự Động (`server/services/tunnelService.js`)**:
   - Tự động kích hoạt `localtunnel` cho cổng 5000 khi đăng media lên Instagram/Threads để Meta có thể fetch tệp hình ảnh/video từ máy cục bộ.
3. **Dọn Dẹp Tệp Tạm Tự Động (`server/services/cleanupService.js`)**:
   - Quét định kỳ và xóa bỏ các tệp media rác đã quá hạn (>7 ngày) trong thư mục `uploads/` nếu không còn bài viết nào lưu trong cơ sở dữ liệu tham chiếu tới.

### 💾 C. Sao Lưu & Khôi Phục Dữ Liệu (`BackupModal.jsx`, `db.js`, `index.js`)
1. **Nút `💾 Backup & Khôi Phục` Trên Thanh Menu**:
   - Mở cửa sổ quản lý sao lưu dữ liệu toàn diện.
2. **Xuất & Nhập File Sao Lưu (Export/Import JSON)**:
   - Tải file `fb_publisher_backup_YYYY-MM-DD.json` chứa toàn bộ danh sách 37+ Fanpage, Access Token đã mã hóa, bài viết, lịch đăng bài và **tất cả API Keys (Google Gemini, Grok 4.5, OpenAI ChatGPT, Facebook App Secret)** đã được mã hóa AES-256 an toàn. Khôi phục dữ liệu tức thì chỉ với 1-click.

### 💬 D. Quản Lý Bình Luận Live & Tự Động Phản Hồi (`LiveCommentManager.jsx`, `facebookService.js`, `aiService.js`)
- Cho phép xem bình luận trực tiếp của bài viết trên Fanpage và dùng AI gợi ý câu trả lời thông minh (`/api/ai/suggest-reply`) trước khi gửi trực tiếp từ ứng dụng.

### 📖 E. Hướng Dẫn Tương Tác API & Pháp Lý (`ApiGuideModal.jsx`, `public/`)
- Màn hình hướng dẫn lấy Access Token và API Key trực quan cho người dùng mới.
- Trang Điều khoản dịch vụ (`terms-of-service.html`) & Chính sách bảo mật (`privacy-policy.html`) đạt chuẩn xét duyệt App của Meta.

### 🔒 F. Loại Bỏ Mã PIN Đăng Nhập Đã Đơn Giản Hóa
- Xóa bỏ chức năng bắt buộc nhập mã PIN gây phiền phức khi thao tác, giúp mở ứng dụng vào thẳng Dashboard làm việc ngay (giao diện `SecurityLock.jsx` vẫn được lưu dưới dạng module tùy chọn).

### 🛠️ G. Khắc Phục Triệt Để Lỗi Màn Hình Đen (Stability & Asset Fixes)
1. **Sửa lỗi tham số `onOpenBackup`**: Khai báo chuẩn tham số trong `Header.jsx`.
2. **Cố định tên tệp mã nguồn trong `vite.config.js`**: Đưa về `/assets/app.js` và `/assets/index.css` để tránh lỗi 404 do trình duyệt lưu cache tên file ngẫu nhiên.
3. **Bộ lọc `VALID_TABS` trong `App.jsx`**: Tự động ép chuyển về tab `Dashboard` nếu `localStorage` lưu tên tab cũ không hợp lệ.
4. **Cơ chế `ErrorBoundary` trong `main.jsx`**: Bẫy lỗi và hiển thị giao diện phục hồi khi trình duyệt mất đồng bộ.

---

## 📂 3. Cấu Trúc Mã Nguồn Chính (Source Code Architecture)

```
c:\Users\Administrator\Desktop\New folder\2026-2-muti
├── data/
│   └── db.json                  # Cơ sở dữ liệu JSON chính (tự tạo: Accounts, Posts, Settings, Logs)
├── public/
│   ├── privacy-policy.html      # Trang chính sách bảo mật cho Meta App Review
│   └── terms-of-service.html    # Trang điều khoản dịch vụ cho Meta App Review
├── server/
│   ├── index.js                 # Server Express API (Port 5000) & Static File Server
│   ├── db.js                    # JsonDB Engine (Mã hóa Token AES-256, Export/Import Backup)
│   ├── services/
│   │   ├── accountService.js    # Quản lý Token dài hạn Facebook Fanpage
│   │   ├── aiService.js         # Phân tích Video AI, Lọc chữ rác/font lỗi, Sinh biến thể
│   │   ├── cleanupService.js    # Dọn dẹp tệp media rác hết hạn (>7 ngày) trong uploads/
│   │   ├── facebookService.js   # Kết nối Graph API Facebook, Roles, Live Comments
│   │   ├── instagramService.js  # Tích hợp đăng bài/Reels lên Instagram Business
│   │   ├── postPublisher.js     # Đăng bài đa kênh tự động
│   │   ├── scheduler.js         # Cron Worker chạy ngầm lịch đăng bài & Auto-Reply Bot
│   │   ├── threadsService.js    # Tích hợp đăng bài lên Threads Profile
│   │   └── tunnelService.js     # Khởi tạo Localtunnel để cung cấp Public Media URL cho IG/Threads
│   └── utils/
│       ├── cryptoUtils.js       # Hàm mã hóa/giải mã AES-256
│       └── fontSanitizer.js     # Bộ lọc khử lỗi font Mojibake & Double UTF-8
├── src/
│   ├── App.jsx                  # Main Layout, Tab Router & Modals State
│   ├── main.jsx                 # Entry Point & ErrorBoundary
│   ├── index.css                # Style Tokens (Dark mode, Glassmorphism UI)
│   ├── utils/
│   │   └── unicodeFont.js       # Utility chuyển đổi font chữ Unicode (Bold, Italic, Cursive...)
│   └── components/
│       ├── Header.jsx           # Thanh Menu Navigation (Dashboard, AI, Fanpages, Backup)
│       ├── Dashboard.jsx        # Thống kê tổng quan Fanpage & Bài đăng
│       ├── AiContentGenerator.jsx# Studio Phân Tích Video AI & Sinh Biến Thể 15 Fanpage
│       ├── AccountManager.jsx   # Quản lý 37+ Fanpage, Token Status, Phân Nhóm, Roles
│       ├── PostPublisher.jsx    # Soạn bài thủ công, chọn Unicode Font & Lên lịch đăng
│       ├── PostHistory.jsx      # Lịch sử bài đã đăng & Quản lý bình luận live
│       ├── BackupModal.jsx      # Cửa sổ Export/Import Backup JSON
│       ├── ApiGuideModal.jsx    # Cửa sổ hướng dẫn cài đặt API Key & Access Token
│       ├── LiveCommentManager.jsx# Giao diện quản lý & AI phản hồi bình luận live
│       └── SecurityLock.jsx     # Giao diện khóa bảo mật PIN (tùy chọn)
├── render.yaml                  # Cấu hình triển khai ứng dụng lên Render Cloud
├── vite.config.js               # Cấu hình Vite Build cố định file assets/app.js & assets/index.css
└── package.json                 # Dependencies & Build Scripts
```

---

## 💡 4. Hướng Dẫn Cho AI / Model Tiếp Theo (Instructions for Next Model)
Khi bắt đầu một phiên trò chuyện mới, Model AI tiếp theo hãy đọc tài liệu này để nắm rõ toàn bộ bối cảnh:
*Tài liệu này được tạo tự động để lưu trữ trạng thái dự án chuẩn xác nhất.*
