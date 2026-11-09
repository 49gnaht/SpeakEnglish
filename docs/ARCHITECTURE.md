# Kiến trúc

## Tổng quan
```
Trình duyệt (Chrome)
 ├─ index.html  ← app chính, JS thuần trong 1 file
 │    ├─ Web Speech API: speechSynthesis (đọc mẫu), SpeechRecognition (nhận giọng, en-US)
 │    ├─ MediaRecorder (thu âm), IndexedDB (bản thu trước/sau)
 │    └─ localStorage (mọi dữ liệu học, theo hồ sơ)
 ├─ store.js    ← hồ sơ + tên khóa (window.NTStore)
 └─ sync.js     ← Firebase (ES module, nạp sau): Auth, Firestore, Analytics, góp ý
GitHub Pages (noitheo.com) chỉ phục vụ file tĩnh. Không có máy chủ riêng.
```
Thứ tự nạp: `store.js` (classic) → JS chính trong `index.html` → `sync.js` (module, chạy sau). Trang chính chạy được kể cả khi Firebase không tải được (mất mạng, bị chặn).

## Hồ sơ người học (`store.js`)
- `speak.profiles.v1`: `[{ id, name, kind?, at }]`. `kind`: `0` chỉ bài người lớn, `1` chỉ bài trẻ em, không có = cả hai. `at`: thời điểm sửa (để đồng bộ tên/loại giữa các máy).
- `speak.profile.cur`: hồ sơ đang chọn. Đổi hồ sơ = ghi khóa này rồi tải lại trang.
- `speak.profilesGone.v1`: id hồ sơ đã xóa (để máy khác không thêm lại).
- Khóa dữ liệu theo hồ sơ: `keys(id)` trả về các khóa dưới đây, hồ sơ `main` không có hậu tố, hồ sơ khác thêm `:<id>`.

| Khóa | Nội dung |
|---|---|
| `speak.lessons.v1` | Mảng bài học (xem dưới) |
| `speak.prefs.v2` | Cài đặt `P` (xem dưới) |
| `speak.prefsAt` | Thời điểm sửa cài đặt (đồng bộ: mới hơn thắng) |
| `speak.samples.v1` | id bài mẫu đã từng thêm (bài mẫu bị xóa không thêm lại) |
| `speak.deleted.v1` | id bài đã xóa (tombstone khi đồng bộ) |
| `speak.days.v1` | Nhật ký theo ngày |
| `speak.words.v1` | Từ từng đỏ / đã chinh phục |
| `speak.badges.v1` | Huy hiệu `{ id: 'YYYY-MM-DD' }` |

Khóa dùng chung cả máy: `speak.activated` (đã nói câu đầu tiên, cho Analytics), `fakeUser` chỉ có trong test.

## Bài học
```js
{
  id, title, titleVi, group,          // group: 0 người lớn, 1 trẻ em
  sample: true?,                      // bài mẫu (id bắt đầu 'mau-')
  items: [{ en, vi }],
  best: { [chỉ số câu]: điểm 0..1 },  // điểm cao nhất từng câu
  skip: { [chỉ số câu]: 1 }?,         // câu tạm bỏ qua
  whole: [{ ts, score, secs, wpm, level, echo? }],  // 20 lần nói cả bài gần nhất
  firstWhole?,                        // điểm lần nói cả bài đầu tiên (để so khi ôn)
  wholeSkip?, wholeFails?,            // tạm bỏ qua / số lần chưa đạt phần nói cả bài
  started?, doneAt?,                  // ngày mở lần đầu / ngày qua bài ('YYYY-MM-DD')
  rev?: { due, n, last? },            // lịch ôn
  last, created, mod                  // câu đang học, thời điểm tạo / sửa (mod dùng khi gộp)
}
```
Bài mẫu định nghĩa trong mảng `SAMPLES` (mỗi bài `{ id, title, titleVi, group, items: [[en, vi], …] }`), hàm `seed()` thêm vào máy. Thứ tự học: `KID_ORDER` (sắp xếp tay, dễ → khó) và `ADULT_ORDER`.

## Cài đặt `P` (theo hồ sơ)
`level` (chữ trên thẻ: hiện hết / chữ đầu / che hết), `showVi`, `rate` (tốc độ đọc mẫu), `voice`, `autoMic`, `autoNext`, `loopListen`, `mode` (0 từng câu, 1 cả bài), `group` (tab đang xem), `noConcurrent` (máy không vừa nhận giọng vừa thu âm), `silent`, `goal` (mục tiêu câu/ngày), `echo` (nghe – nói theo).

## Nhật ký ngày (`speak.days.v1`)
```js
{ 'YYYY-MM-DD': {
    sec,                         // giây luyện (đếm khi ở màn luyện và có thao tác trong 1 phút)
    s: { 'idBài|chỉSốCâu': [số lần thử, đạt ở lần thứ (0 = chưa)] },
    wl: { idBài: số câu },       // nói cả bài đạt: tính đủ các câu
    w, wb,                       // số lần nói cả bài, điểm cao nhất
    red: { từ: số lần đỏ },
    ok                           // đã đạt mục tiêu ngày
} }
```
Giữ tối đa 400 ngày. Từ: `{ từ: [số lần đỏ, số lần đúng liền sau lần đỏ gần nhất, ngày chinh phục] }` – đúng liền 2 lần thì chinh phục.

## Chấm điểm lời nói
1. `normWords` chuẩn hóa (chữ thường, bỏ dấu câu, mở rộng viết tắt, số → chữ, giờ `6:00` → `six o'clock`, từ đồng âm…).
2. `align` dóng hàng câu mẫu với lời nghe được bằng quy hoạch động (LCS) có thưởng cho các từ đứng liền nhau và cho phép ghép/tách từ ghép (`every day` / `everyday`).
3. `evaluate(en, transcripts)` chọn bản nghe tốt nhất trong các phương án nhận giọng, trả `score` (tỉ lệ từ đúng), `marks` (từng từ đúng/sai), `hits`.
4. Nói cả bài: `evaluateWhole` dóng cả đoạn, trả điểm và các câu yếu.

## Đồng bộ (`sync.js`)
- Firestore: `users/{uid}` = `{ profiles, gone, updated }`; `users/{uid}/profiles/{pid}` = `{ lessons, prefs, prefsAt, samples, deleted, days, words, badges, updated }` (các trường là chuỗi JSON).
- Khi đăng nhập, khi dữ liệu đổi (chờ 2,5 giây), khi ẩn trang và khi quay lại sau > 1 phút: đọc bản trên mây → gộp với máy → ghi cả hai nếu khác.
- Gộp bài (`mergeLesson`): nội dung theo bản có `mod` mới hơn; `best` lấy điểm cao nhất từng câu; `whole` hợp nhất theo thời điểm; `started` sớm nhất. Bài trong danh sách đã xóa thì bỏ.
- Gộp ngày/từ/huy hiệu: lấy giá trị lớn hơn, hợp nhất; cài đặt: bản có `prefsAt` mới hơn thắng; hồ sơ: bản có `at` mới hơn thắng.
- `window.NTApp.refresh()` (trong index.html) vẽ lại khi dữ liệu từ máy khác về.

## Analytics (Google Analytics qua Firebase)
Tắt Google Signals và cá nhân hóa quảng cáo (có người dùng trẻ em). Gọi `track(tên, tham số)` trong index.html; sự kiện xếp hàng chờ nếu `sync.js` chưa nạp.

| Sự kiện | Khi nào |
|---|---|
| `activate` | Lần đầu nói một câu trên máy đó |
| `sentence_try` | Mỗi lần nói một câu (`passed`, `group`) |
| `whole_try` | Mỗi lần nói cả bài (`score` làm tròn 10, `echo`, `review`) |
| `lesson_done` | Qua bài |
| `skip` | Tạm bỏ qua (`what`: sentence / whole) |
| `goal_reached`, `review_done`, `badge_earned` | Đạt mục tiêu ngày, ôn bài, nhận huy hiệu |
| `lesson_created`, `profile_added`, `profile_kind`, `echo_toggle`, `login` | Thao tác của người dùng |
| `view_stats`, `view_parents`, `feedback_open`, `feedback_sent` | Mở trang thống kê, tổng kết, góp ý |
| `mic_error` | Lỗi micro / nhận giọng (`err`) |

## Tính năng phụ
- **Nhờ Gemini nhận xét**: chuyển bản thu sang WAV 16 kHz mono (`toWav`), chia sẻ qua Web Share kèm câu lệnh (`aiPrompt`, có bản dành cho trẻ em); máy tính thì tải file, chép câu lệnh, mở gemini.google.com.
- **Bản thu trước/sau**: IndexedDB `noitheo-clips`, khóa `hồSơ|bài|câu` (hoặc `|w` cả bài), giữ bản đầu tiên và bản đạt gần nhất.
- **Huy hiệu**: mảng `BADGES` (24 cái, 6 loại: câu đạt, chuỗi ngày, bài qua, từ chinh phục, ôn bài, đúng ngay trong ngày).
