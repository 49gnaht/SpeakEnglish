# Lịch sử quyết định

Ghi lại những gì đã chọn và lý do, để không vô tình làm ngược ý chủ dự án. Mới nhất ở trên.

## Tháng 11/2026
- **Số liệu tháng đầu** (9/10–5/11): Analytics báo 65 "người dùng" nhưng chỉ 6 trình duyệt thật sự nói (`activate`), không có `mic_error`. Link chưa chia sẻ ra ngoài, nên đây là thiết bị gia đình + bot quét tên miền mới. Lượt luyện của gia đình cao nhất 15–20/10, giảm mạnh từ khoảng 22/10 – trùng thời điểm đổi trẻ em sang ngưỡng 80% và tính cả từ ngắn; chưa xác nhận nguyên nhân.

## Tháng 10/2026
- **Ô "Để qua bài"** trong màn luyện (danh sách việc còn thiếu, nút nhảy tới câu cần luyện / nói cả bài / tạm bỏ qua), dòng "Để qua bài: …" trên thẻ bài, ghi rõ tên bài cần qua ở bài bị khóa. Số lần thử nói cả bài lưu theo bài.
- **Bài mẫu người lớn cũng mở lần lượt** như trẻ em; bỏ ô "Học bài mẫu theo thứ tự".
- **Chọn loại bài theo hồ sơ** (người lớn / trẻ em / cả hai). Có loại thì ẩn tab nhóm.
- **Một ngưỡng 80% cho tất cả** (câu và cả bài), **tính mọi từ** kể cả *a, the, to*. Lý do: logic đơn giản, code dễ. Bài đã qua giữ nguyên (`doneAt`).
- **Tạm bỏ qua sau 3 lần** cho cả trẻ em và người lớn, cả câu và cả bài. Bỏ luật cũ "thử 10 lần trên 50% thì cho qua". Lý do: không chặn luồng học.
- **Analytics + nút Góp ý**. Tắt cá nhân hóa quảng cáo vì có trẻ em.
- **Nghe – nói theo cả bài** cho hồ sơ "chưa biết đọc" (bé nhỏ chưa đọc được cả đoạn). Câu chưa đạt thì đọc lại 1 lần rồi đi tiếp.
- **Đợt 3**: ôn bài sau 7/14/30/60 ngày, 24 huy hiệu mốc, nghe lại bản thu đầu tiên và bản đạt gần nhất.
- **Đợt 2**: trang thống kê từng hồ sơ (14 ngày, đúng ngay lần đầu theo tuần, điểm cả bài, từ đã chinh phục) và tổng kết tuần cho bố mẹ.
- **Đợt 1**: nhật ký theo ngày, mục tiêu ngày (mặc định 10 câu), chuỗi ngày có ngày nghỉ phép, lịch dán sao.
- **Hồ sơ người học + đăng nhập Google + đồng bộ Firestore**. Chọn Firebase thay vì tự dựng máy chủ (miễn phí, không phải vận hành). Không đăng nhập vẫn dùng được.
- **Tên miền noitheo.com** (Cloudflare Registrar), trang Bài viết thành trang chủ, Video chuyển sang `video.html`.
- Giữ chạy trên **GitHub Pages**; đã cân nhắc chuyển Cloudflare Pages để repo private nhưng tạm chưa làm (nội dung web vốn công khai khi mở trang).
- **Khóa bài theo thứ tự, tối đa 4 bài mới/ngày**. Bỏ ý tưởng "bố mẹ mở khóa bằng phép tính" vì phức tạp.
- **Giao diện trẻ em**: lời khen, màu cam dịu, pháo sao, khen khi tiến bộ, đọc mẫu chậm khi thử nhiều lần. Số lần thử không lưu qua các lần mở (chỉ trong lúc đang ở câu đó).
- **Nhờ Gemini nhận xét** (chỉ Gemini, không làm ChatGPT/Claude): gửi file WAV + câu lệnh qua bảng chia sẻ.
- Không tự bật micro, không tự sang câu khi chưa bấm (người dùng tự điều khiển); nút Nghe mặc định lặp đến khi bấm Dừng.
- Bài được tạo bằng cách nhờ ChatGPT chuyển ảnh chụp thành chữ theo mẫu "mỗi câu tiếng Anh một dòng, dòng dịch ngay dưới".
