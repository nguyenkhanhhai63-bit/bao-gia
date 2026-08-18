BẢN V5 - MOBILE TÌM MÁY NHANH

Nâng cấp cho điện thoại:
- Thanh tìm kiếm dính trên đầu khi cuộn.
- Gõ tên máy sẽ hiện gợi ý ngay.
- Bấm gợi ý sẽ nhảy đúng tới máy và tự mở chi tiết.
- Trên điện thoại mặc định thu gọn toàn bộ model, chỉ hiện tên máy.
- Bấm tên máy để xổ giá.
- Có nút kính lúp nổi góc dưới màn hình để quay nhanh về ô tìm kiếm.
- Desktop vẫn giữ 2 cột.
- Không có phân loại hãng.
- Không có ảnh máy.
- Vẫn tự cập nhật mức lãi từ markup.js mỗi 60 giây.

UPLOAD ĐÈ 5 FILE:
index.html
styles.css
app.js
config.js
markup.js


BẢN V6 - FOOTER NỘI BỘ
- Bỏ dòng "Giá có thể thay đổi..."
- Thêm thông báo:
  "Thông tin chỉ dành cho nội bộ. Vui lòng không chia sẻ ra bên ngoài."
- Thêm:
  "© 2026 Tạo bởi haimmo | noibo.sieudidong.vn"
- haimmo được làm nổi bật.
- Giữ nguyên toàn bộ tính năng V5.


BẢN V7 - LOAD NHANH
- Lưu bảng giá gần nhất trong trình duyệt để lần mở sau hiện gần như ngay lập tức.
- Sau khi hiện cache, website cập nhật dữ liệu mới ở nền.
- Không còn chớp "Không tìm thấy sản phẩm" trong lúc đang tải.
- markup.js và Google Sheet được tải song song thay vì tuần tự.
- Nếu mạng chậm/lỗi tạm thời, vẫn giữ bảng giá gần nhất thay vì trắng trang.
- Tự cập nhật mỗi 60 giây như cũ.


BẢN V8 - FOOTER FINAL
Footer:
© 2026 Tạo bởi haimmo | Internal Price System

Đã bỏ domain ở footer.
Giữ nguyên toàn bộ tính năng load nhanh, cache, tìm kiếm và tự cập nhật lãi.


BẢN V9 - FIX "CHỈ HIỆN HÀNG CÓ GIÁ"
- Trước đây app đã loại bỏ dòng không có giá ngay từ lúc đọc dữ liệu,
  nên checkbox bật/tắt không thể làm chúng hiện lại.
- Bản này giữ lại các sản phẩm/màu chưa có giá.
- Tick: chỉ hiện hàng có giá.
- Bỏ tick: hiện cả hàng chưa có giá, giá hiển thị dấu "—".
- Đổi cache key để không dùng lại dữ liệu cũ đã bị lọc.
