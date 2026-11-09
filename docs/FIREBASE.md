# Firebase, tên miền và triển khai

## Triển khai web
- Repo GitHub `49gnaht/SpeakEnglish`, **Settings → Pages**: nguồn là nhánh `main`, thư mục `/`. Push lên `main` là web cập nhật sau 1–2 phút.
- Tên miền `noitheo.com` mua ở **Cloudflare Registrar**. DNS trên Cloudflare: 2 bản ghi `CNAME` (`@` và `www`) trỏ về `49gnaht.github.io`, chế độ **DNS only** (đám mây xám – để cam thì GitHub không cấp được HTTPS).
- File `CNAME` trong repo chứa `noitheo.com`. GitHub Pages đã bật **Enforce HTTPS**.
- Link cũ `49gnaht.github.io/SpeakEnglish` tự chuyển về `noitheo.com`. Lưu ý: dữ liệu localStorage tách theo tên miền.

## Project Firebase `noitheo` (gói Spark, miễn phí)
- Console: https://console.firebase.google.com/project/noitheo
- Cấu hình web nằm trong `sync.js` (công khai được, bảo vệ dữ liệu là nhờ rules).
- SDK: Firebase JS 10.12.2 nạp từ `https://www.gstatic.com/firebasejs/10.12.2/…`.

### Authentication
- Nhà cung cấp: **Google**.
- **Authorized domains** phải có: `noitheo.com`, `www.noitheo.com`, `49gnaht.github.io` (và `localhost` có sẵn để thử trên máy).
- Danh sách tài khoản đã đăng nhập: https://console.firebase.google.com/project/noitheo/authentication/users
- Đăng nhập dùng popup (`signInWithPopup`), lỗi chặn popup thì chuyển sang redirect.

### Firestore (location `asia-southeast1`)
- Dữ liệu: https://console.firebase.google.com/project/noitheo/firestore/databases/-default-/data
- Rules: https://console.firebase.google.com/project/noitheo/firestore/databases/-default-/rules
- Nội dung rules nằm trong `firestore.rules` của repo. **Mỗi lần sửa file này phải dán lại vào Console và bấm Publish**:
  - `users/{uid}/**`: chỉ chính chủ đọc/ghi.
  - `feedback/{id}`: ai cũng tạo được (giới hạn trường và độ dài), không ai đọc/sửa từ web.
- Góp ý người dùng: collection `feedback` (`text`, `rating` 0–4, `contact`, `page`, `profileKind`, `ua`, `uid`, `ts`).

### Analytics
- Measurement ID `G-YKR83X99GY`. Xem: https://console.firebase.google.com/project/noitheo/analytics (chọn **Last 30 days**), mục **Events** để xem từng sự kiện.
- Analytics đếm theo **trình duyệt/thiết bị**, không theo người; tên miền mới còn bị bot quét ghé vào. Chỉ số đáng tin để đo "người dùng thật": số người có `activate` / `sentence_try`.
- Danh sách sự kiện: xem `docs/ARCHITECTURE.md`.

## Đọc số liệu bằng API (tùy chọn, cho Claude Code trên máy)
Muốn Claude Code tự lấy số liệu thay vì chụp màn hình:
1. Cài Google Cloud CLI, chạy `gcloud auth login` và `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.readonly`.
2. Danh sách tài khoản: Firebase CLI `npx firebase-tools auth:export users.json --project noitheo` (cần `npx firebase-tools login`). File này chứa email người dùng – **không commit**, xóa sau khi xem.
3. Analytics: Google Analytics Data API (`analyticsdata.googleapis.com`) với property ID lấy trong Google Analytics → Admin → Property details.
