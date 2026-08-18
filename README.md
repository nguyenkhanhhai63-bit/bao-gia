# Bảng giá ma trận

## Cấu trúc Google Sheet mới
Các cột:

Cột | Sản phẩm | Màu | 8/128 | 8/256 | 12/256 | 12/512 | 16/256 | 16/512 | 16/1T | Thứ tự | Ngày

- Mỗi màu = 1 dòng.
- Dung lượng = nằm ngang theo cột.
- Giá = nhập tại giao điểm Màu × Dung lượng.
- Cột / Sản phẩm / Thứ tự / Ngày chỉ cần nhập ở dòng đầu của mỗi máy.
- Các dòng màu phía dưới có thể để trống những cột này.
- Có thể thêm cột dung lượng mới trước cột `Thứ tự`; website tự nhận, không cần sửa code.

## Khi đổi Google Sheet sang mẫu này
1. Dùng file `Mau_Bang_Gia_Ma_Tran.xlsx` hoặc sửa Sheet hiện tại theo đúng cấu trúc.
2. Publish lại sheet `Bảng giá` thành CSV.
3. Nếu URL publish thay đổi, cập nhật `config.js`.
4. Trên GitHub chỉ cần thay file `app.js` bằng file mới trong bộ này.
