# 📜 Facebook Multi-Publisher All-in-One - Document Lịch Sử Dự Án & Cấu Trúc Hệ Thống

---

## 📌 1. Tổng Quan Dự Án (Project Overview)
- **Tên ứng dụng**: Facebook Multi-Publisher All-in-One System
- **Đường dẫn thư mục**: `c:\Users\Administrator\Desktop\New folder`
- **Địa chỉ khởi chạy cục bộ**: `http://localhost:5000` (Node Express Server + Production Assets) & `http://localhost:5173` (Vite Live Server)
- **Mục tiêu**: Quản lý nhiều Fanpage Facebook cùng lúc, tự động phân tích Video bằng AI (Google Gemini 1.5 Flash), sinh ra các biến thể nội dung độc bản cho 15+ Fanpage cùng 1 lúc, lên lịch đăng bài đa kênh, quản lý bình luận live và bảo vệ dữ liệu.

---

## 🚀 2. Tất Cả Các Tính Năng Đã Hoàn Thành (Key Accomplishments)

### 📹 A. Phân Tích Video AI & Sinh Biến Thể Cho Đa Fanpage (`server/services/aiService.js`)
1. **Phân tích Video bằng Google Gemini 1.5 Flash**:
   - Nhận video từ đường dẫn hoặc tải lên máy chủ, AI phân tích chủ đề video và sinh bài đăng Tiếng Anh cuốn hút.
2. **Sinh Biến Thể Độc Bản Cho Hàng Loạt Fanpage**:
   - Đưa 1 video vào đăng cùng lúc cho 15+ Fanpage. AI sinh ra 15 nội dung hoàn toàn khác nhau (khác Hooks, góc nhìn phân tích, câu hỏi tương tác).
3. **Quy Tắc Tiêu Đề Độc Bản (Title System)**:
   - **Xóa sạch ký tự rác font (Mojibake UTF-8)**: Tự động lọc bỏ các ký tự lỗi như `Â¦`, `THÃªM`, `Ãª`, `…`.
   - **Xóa sạch quảng cáo / link tên miền / từ thừa**: Tự động loại bỏ `FULL VIDEO`, `HTTPS NEWSPULSENOWS.COM`, `XEM THÊM`, `SEE MORE`... giữ lại đúng tiêu đề chuẩn của video.
   - **Không ghép tên Fanpage ở đuôi**: Tiêu đề được giữ hoàn toàn tập trung vào video.
   - **Không dùng các đuôi gạch nối lặp lại**: Loại bỏ các chuỗi rác như `- Performance Overview`, `- High-Impact Action`.
   - **Mỗi Fanpage nhận 1 Tiêu Đề Tiếng Anh Độc Bản**: Ví dụ:
     - Page 1: `TIM CONWAYS ELEPHANT STORY BROKE THE CAST...: OFFICIAL SHOWCASE`
     - Page 2: `INSIDE TIM CONWAYS ELEPHANT STORY BROKE THE CAST...`
     - Page 3: `THE ART OF TIM CONWAYS ELEPHANT STORY BROKE THE CAST...`

### 💾 B. Sao Lưu & Khôi Phục Dữ Liệu (`BackupModal.jsx`, `db.js`, `index.js`)
1. **Nút `💾 Backup & Khôi Phục` Trên Thanh Menu**:
   - Mở cửa sổ quản lý sao lưu dữ liệu toàn diện.
2. **Xuất File Sao Lưu (Export JSON)**:
   - Tải file `fb_publisher_backup_YYYY-MM-DD.json` chứa danh sách 37+ Fanpage, Access Token đã mã hóa, bài viết, lịch đăng và cài đặt API Keys.
3. **Nhập File Sao Lưu (Import JSON)**:
   - Khôi phục dữ liệu tức thì từ file `.json` sao lưu chỉ với 1 click.

### 🔒 C. Loại Bỏ Mã PIN Đăng Nhập
- Xóa bỏ chức năng mã PIN bảo mật gây phiền phức khi thao tác, giúp mở ứng dụng vào thẳng Dashboard làm việc ngay.

### 👥 D. Giao Diện Chọn Nhóm Fanpage Trực Quan
- Mở rộng cửa sổ chọn nhóm Fanpage to rõ, cho phép chọn theo nhóm hoặc chọn tất cả dễ dàng thay vì cuộn nhỏ.

### 🛠️ E. Khắc Phục Triệt Để Lỗi Màn Hình Đen (Stability & Asset Fixes)
1. **Sửa lỗi tham số `onOpenBackup`**: Khai báo chuẩn tham số trong `Header.jsx`.
2. **Cố định tên tệp mã nguồn trong `vite.config.js`**: Đưa về `/assets/app.js` và `/assets/index.css` để tránh lỗi 404 do trình duyệt lưu cache tên file ngẫu nhiên.
3. **Bộ lọc `VALID_TABS` trong `App.jsx`**: Tự động ép chuyển về tab `Dashboard` nếu `localStorage` lưu tên tab cũ không hợp lệ.
4. **Cơ chế `ErrorBoundary` trong `main.jsx`**: Bẫy lỗi và hiển thị giao diện phục hồi khi trình duyệt mất đồng bộ.

---

## 📂 3. Cấu Trúc Mã Nguồn Chính (Source Code Architecture)

```
c:\Users\Administrator\Desktop\New folder
├── data/
│   └── db.json                  # Cơ sở dữ liệu JSON chính (Accounts, Posts, Settings, Logs)
├── server/
│   ├── index.js                 # Server Express API (Port 5000) & Static File Server
│   ├── db.js                    # JsonDB Engine (Mã hóa Token AES-256, Export/Import Backup)
│   ├── services/
│   │   ├── aiService.js         # Phân tích Video AI, Lọc chữ rác/font lỗi, Sinh biến thể
│   │   ├── facebookService.js   # Kết nối Graph API Facebook, Roles, Comments
│   │   ├── accountService.js    # Quản lý Token dài hạn Facebook Fanpage
│   │   ├── postPublisher.js     # Đăng bài đa kênh tự động
│   │   └── scheduler.js         # Cron Worker chạy ngầm lịch đăng bài & Auto-Reply Bot
│   └── utils/
│       └── cryptoUtils.js       # Hàm mã hóa/giải mã AES-256
├── src/
│   ├── App.jsx                  # Main Layout, Tab Router & Modals State
│   ├── main.jsx                 # Entry Point & ErrorBoundary
│   ├── index.css                # Style Tokens (Dark mode, Glassmorphism UI)
│   └── components/
│       ├── Header.jsx           # Thanh Menu Navigation (Dashboard, AI, Fanpages, Backup)
│       ├── Dashboard.jsx        # Thống kê tổng quan Fanpage & Bài đăng
│       ├── AiContentGenerator.jsx# Studio Phân Tích Video AI & Sinh Biến Thể 15 Fanpage
│       ├── BackupModal.jsx      # Cửa sổ Export/Import Backup JSON
│       ├── AccountManager.jsx   # Quản lý 37+ Fanpage, Token Status, Phân Nhóm
│       ├── PostPublisher.jsx    # Soạn bài thủ công & Lên lịch đăng
│       └── PostHistory.jsx      # Lịch sử bài đã đăng & Quản lý bình luận live
├── vite.config.js               # Cấu hình Vite Build cố định file assets/app.js
└── package.json                 # Dependencies & Build Scripts
```

---

## 💡 4. Hướng Dẫn Cho AI / Model Tiếp Theo (Instructions for Next Model)
Khi bắt đầu một phiên trò chuyện mới, Model AI tiếp theo hãy đọc tài liệu này để nắm rõ toàn bộ bối cảnh:
1. **Không tạo lại các hàm đã có**: Tất cả các hàm như `extractVideoTopic`, `generateMultiPageVariations`, `exportBackupData`, `importBackupData` đã hoạt động 100% chuẩn xác trong `server/services/aiService.js` và `server/db.js`.
2. **Duy trì quy tắc sinh tiêu đề**: Tiêu đề biến thể AI phải luôn là Tiếng Anh độc bản, đã được làm sạch rác font (`Â¦`, `THÃªM`), không dính tên Fanpage ở đuôi, và không chứa URL tên miền rác.
3. **Giữ cấu hình Vite build cố định**: Tệp `vite.config.js` đã được cố định xuất ra `assets/app.js` để tránh bị 404 cache màn hình đen.
4. **Hệ thống Server**: Express backend chạy trên port `5000`, tự động khởi chạy Cron Worker cho lịch đăng bài.

---
*Tài liệu này được tạo tự động để lưu trữ trạng thái dự án chuẩn xác nhất.*
