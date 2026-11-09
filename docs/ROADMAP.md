# Việc tiếp theo và ý tưởng

## Nên làm sớm
1. **Tìm hiểu vì sao các con ít học từ cuối tháng 10.** Nếu do khó: cân nhắc mức "dễ" theo hồ sơ (ví dụ 70%) – hỏi chủ dự án trước, vì đã chọn một ngưỡng 80% cho đơn giản.
2. **Lọc số liệu Analytics**: bỏ bot, gắn nhãn thiết bị gia đình (user property) để sau này tách người ngoài.
3. **Màn chào cho người mới**: app làm gì, chọn trẻ em/người lớn, vào thẳng bài đầu với nút Nói thật rõ.
4. **Trang chính sách quyền riêng tư** (có trẻ em, có đăng nhập Google, có Analytics) – cần trước khi mời người ngoài hoặc chạy quảng cáo.
5. Kiểm tra rules nhận góp ý đã được Publish chưa (tháng đầu: 3 lần mở form, 0 lần gửi).

## Nội dung học
- Soạn thêm bài trẻ em theo 3 cấp (câu 3–5 từ, 6–8 từ, đoạn kể ngắn) và bài người lớn theo tình huống / hội thoại 2 vai. Tự viết, không chép sách.
- Giọng đọc có ngữ điệu bằng AI, tạo một lần lưu mp3 theo từng câu: Google Cloud TTS (Chirp 3 HD, có 1 triệu ký tự miễn phí/tháng), Gemini TTS (điều khiển cảm xúc, nhiều giọng), OpenAI gpt-4o-mini-tts, ElevenLabs (tốt nhất, từ 5 USD/tháng). Cần thời điểm từng từ để tô chữ khi đọc. Ghi rõ giọng do AI tạo.
- Nguồn người thật (kiểm tra giấy phép từng file): Tatoeba (âm thanh theo giấy phép từng người đọc), VOA Learning English, LibriVox. Không tải lại nội dung YouTube.
- Đề xuất thử: 10 bài trẻ em × 2–3 dịch vụ giọng, cho các bé chọn; sửa app để câu có file mp3 thì dùng file, không có thì dùng giọng trình duyệt.

## Đưa ra ngoài
- Trước khi quảng cáo: có HTTPS (đã có), màn chào, chính sách quyền riêng tư, số liệu sạch.
- Thử miễn phí trước: gửi link cho 5–10 gia đình quen, nhóm phụ huynh; video 30–60 giây quay các bé dùng app.
- Quảng cáo thử nhỏ: Facebook/Instagram nhắm bố mẹ 25–45 tuổi (2–3 triệu đồng / 2 tuần), Google Search từ khóa luyện nói cho bé (~1 triệu).
- Chỉ số quyết định: % người vào trang nói được câu đầu (`activate`), % quay lại sau 7 ngày (mục tiêu > 20%), số người bấm thử "gói gia đình".

## Ý tưởng xa hơn
- PWA (cài vào màn hình chính) và nhắc học hằng ngày.
- Nhận xét phát âm bằng AI ngay trong app (cần máy chủ nhỏ giữ khóa API, ví dụ Cloudflare Worker).
- Đồng bộ cả trang Video; bài theo sách giáo khoa tiểu học; gói cho giáo viên/trung tâm.
