# Nói Theo – web luyện nói tiếng Anh

Đọc file này trước khi làm việc trong repo. Chi tiết thêm ở `docs/`.

## Dự án là gì
- Web app tĩnh luyện **nói theo** tiếng Anh, chạy tại **https://noitheo.com** (GitHub Pages, repo `49gnaht/SpeakEnglish`, nhánh `main`, thư mục gốc).
- Người dùng chính hiện nay là gia đình chủ dự án (bố mẹ + các con nhỏ đang học tiểu học/mẫu giáo). Chưa quảng bá ra ngoài.
- Hai trang: `index.html` (luyện theo bài có chữ, trang chính) và `video.html` (shadowing theo video YouTube, ít dùng).
- Mọi chữ trên giao diện bằng **tiếng Việt**; nội dung bài học tiếng Anh kèm bản dịch.

## Cách làm việc với chủ dự án
- Trao đổi bằng **tiếng Việt**, ngắn gọn. Chủ dự án là kỹ sư phần mềm, thích prompt ngắn, để Claude tự tìm hiểu và đề xuất.
- Thay đổi về **luật học / trải nghiệm người dùng**: trình bày đề xuất (mô tả + ví dụ chữ hiển thị) để chủ dự án duyệt **trước khi code**. Sửa lỗi nhỏ, chỉnh chữ thì làm luôn.
- Ưu tiên **logic đơn giản**, ít ngoại lệ (đã từng bỏ nhiều luật riêng cho trẻ em để code dễ hơn).
- Không chặn luồng học quá nhiều: luôn có lối "tạm bỏ qua, luyện sau".
- Sau khi sửa: chạy `npm test`, commit với message tiếng Anh rõ ràng, push lên `main` (GitHub Pages tự cập nhật sau 1–2 phút). Báo lại cho chủ dự án bằng tiếng Việt: đã đổi gì, đã test gì.

## Chạy và kiểm tra
- Không có bước build. Mở bằng server tĩnh bất kỳ: `npx serve .` hoặc `python3 -m http.server 8000` rồi vào `http://localhost:8000/`.
- Nhận giọng nói (Web Speech API) cần **Chrome** và **HTTPS hoặc localhost**.
- Test tự động: `npm install` (lần đầu, kèm `npx playwright install chromium`), rồi `npm test`. Chạy một nhóm: `npm test -- sync`.
  - `tests/mock-speech.js` giả lập đọc mẫu và nhận giọng (`window.__say`, `window.__sayQueue`).
  - `tests/fake-firebase.js` thay Firebase bằng bản chạy trong bộ nhớ (đăng nhập, Firestore, Analytics).
  - Thêm test mới vào object `TESTS` trong `tests/run.js` khi đổi luật học.

## Cấu trúc file
| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ app chính: HTML + CSS + JS trong một file (~3.200 dòng), chia khối bằng chú thích `/* ---------- tên khối ---------- */` |
| `store.js` | Hồ sơ người học và tên khóa localStorage theo hồ sơ (`window.NTStore`) |
| `sync.js` | ES module: Firebase Auth (Google), đồng bộ Firestore, Google Analytics, gửi góp ý (`window.NTSync`, `window.NTTrack`) |
| `video.html` | Trang shadowing YouTube (cắt đoạn A–B, lặp, đổi tốc độ, thu âm) |
| `doc.html` | Chỉ chuyển hướng link cũ về trang chủ |
| `firestore.rules` | Quy tắc bảo mật Firestore – phải dán tay vào Firebase Console mỗi khi đổi |
| `CNAME` | Tên miền `noitheo.com` cho GitHub Pages |
| `docs/` | Kiến trúc, luật học, Firebase, lịch sử quyết định, việc tiếp theo |

## Các khối chính trong `index.html` (theo thứ tự trong file)
bài mẫu `SAMPLES` → hằng số luật học → lưu trên máy → đọc kết quả ChatGPT (`parseLesson`) → so khớp lời nói (`normWords`, `align`, `evaluate`) → giọng đọc mẫu (TTS) → nghe người dùng nói (`listen`, thu âm) → gửi Gemini nhận xét → nói cả bài (`toggleWhole`, chế độ nghe – nói theo `echoStep`) → hiển thị → khóa bài theo thứ tự (`lockState`, `isDone`, `passState`, `renderGate`) → tạo bài → nhật ký ngày / mục tiêu / chuỗi → từ đã chinh phục → thống kê → ôn bài cũ → huy hiệu → bản thu trước/sau (IndexedDB) → tổng kết bố mẹ → hồ sơ + tài khoản → góp ý → khởi động.

Điều hướng bằng hash: `#` trang chủ, `#bai=<id>` luyện bài, `#on=<id>` ôn bài, `#moi` tạo bài, `#hoso` hồ sơ, `#thongke` thống kê, `#bome` tổng kết bố mẹ.

## Luật học hiện tại (nguồn chính xác: hằng số đầu khối JS trong `index.html`)
- Câu đạt khi đúng **≥ 80%** số từ (`PASS = 0.8`), **tính mọi từ**. Nói cả bài cũng cần ≥ 80%. Trẻ em và người lớn **chung một ngưỡng**.
- Thử **3 lần** chưa đạt (`SKIP_AT`) thì có nút **Tạm bỏ qua, luyện sau** – cho từng câu (đếm lại khi rời câu) và cho phần nói cả bài (đếm lưu theo bài, `l.wholeFails`).
- **Qua bài** = mọi câu đạt hoặc tạm bỏ qua + nói cả bài đạt hoặc tạm bỏ qua. Đã qua thì giữ (`l.doneAt`), đổi ngưỡng sau này không làm mất.
- Bài mẫu **trẻ em và người lớn đều mở lần lượt** (`KID_ORDER`, `ADULT_ORDER`); tối đa **4 bài mới/ngày** mỗi nhóm mỗi hồ sơ (`DAILY_NEW`). Bài tự tạo không khóa.
- Hồ sơ đặt "chưa biết đọc" (`P.echo`): bước nói cả bài thành **nghe – nói theo** (app đọc từng câu, bé nhắc lại; câu chưa đạt đọc lại 1 lần).
- Ôn bài: bài qua được 7 ngày thì nhắc ôn, rồi 14, 30, 60 ngày (`REVIEW_GAPS`); ôn chưa đạt hẹn lại sau 2 ngày.
- Mục tiêu ngày mặc định 10 câu đạt (`P.goal`); chuỗi ngày cho nghỉ 1 ngày mỗi 7 ngày.
- Giao diện trẻ em (bài nhóm 1): lời khen, màu cam dịu thay đỏ, pháo sao, từ lần thử thứ 3 đọc mẫu chậm lại. Cách chấm giống người lớn.

## Dữ liệu
- Lưu chính trong **localStorage theo hồ sơ** (khóa ở `store.js`; hồ sơ `main` dùng khóa không hậu tố). Bản thu âm trước/sau chỉ ở IndexedDB `noitheo-clips`, không đồng bộ.
- Đăng nhập Google thì đồng bộ lên Firestore `users/{uid}` (danh sách hồ sơ) và `users/{uid}/profiles/{pid}` (bài, cài đặt, nhật ký, từ, huy hiệu – lưu dạng chuỗi JSON). Gộp bằng hàm `merge*` trong `sync.js` (điểm cao nhất, hợp nhất, mới nhất thắng).
- Góp ý: Firestore `feedback` (ai cũng tạo được, không ai đọc từ web).
- Chi tiết: `docs/ARCHITECTURE.md`, `docs/FIREBASE.md`.

## Lưu ý khi sửa
- Giữ một file `index.html` tự chứa, JS thuần, không framework, không bước build. Thư viện ngoài chỉ có Firebase SDK 10.12.2 từ gstatic (nạp trong `sync.js`).
- Thêm trường mới vào dữ liệu bài/hồ sơ: nhớ cập nhật phần gộp trong `sync.js` nếu cần đồng bộ, và giữ tương thích dữ liệu cũ trên máy người dùng.
- Đổi `firestore.rules` thì nhắc chủ dự án dán lại vào Console (Firestore → Rules → Publish).
- Chrome Android: không vừa nhận giọng vừa thu âm được (`P.noConcurrent`), nhận giọng tự ngắt khi im lặng – code đã tự mở lại phiên.
- Không đưa thông tin cá nhân của gia đình (tên thật, tuổi, email) vào repo: repo đang public.
