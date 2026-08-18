# Bảng giá GitHub tự cập nhật từ Google Sheet

Bạn chỉ sửa giá trong Google Sheet. Trang GitHub Pages sẽ tự lấy lại dữ liệu mỗi 60 giây.

## 1. Tạo Google Sheet

Mở file `Mau_Bang_Gia_Google_Sheet.xlsx` bằng Google Sheets.

Các cột BẮT BUỘC:

| Cột | Ý nghĩa |
|---|---|
| Cột | `Trái` hoặc `Phải` |
| Sản phẩm | Tên máy |
| Dung lượng | RAM/ROM, ví dụ `12/256` |
| Màu | Đen, Trắng, Green... |
| Giá | Ví dụ `15.666` |
| Thứ tự | Số để sắp xếp sản phẩm |
| Ngày | Ví dụ `18/08/2026` |

Mỗi màu là 1 dòng.

## 2. Publish Google Sheet thành CSV

Trong Google Sheets:

`File` -> `Share` -> `Publish to web`

- Chọn sheet: `Bảng giá`
- Chọn định dạng: `Comma-separated values (.csv)`
- Bấm `Publish`
- Copy đường link được Google tạo.

Lưu ý: đây là link Publish CSV, không phải link chỉnh sửa Google Sheet.

## 3. Gắn link vào website

Mở `config.js`.

Thay:

```js
const SHEET_CSV_URL = "DAN_LINK_CSV_GOOGLE_SHEET_VAO_DAY";
```

bằng:

```js
const SHEET_CSV_URL = "LINK_CSV_BAN_VUA_COPY";
```

## 4. Upload lên GitHub

Upload các file sau lên repository:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`

Vào:

`Settings` -> `Pages` -> `Deploy from a branch`

Chọn:
- Branch: `main`
- Folder: `/ (root)`

## 5. Cách sử dụng hằng ngày

Chỉ cần vào Google Sheet sửa:

- giá
- màu
- dung lượng
- sản phẩm
- thứ tự
- ngày báo giá

KHÔNG cần vào GitHub sửa nữa.

Trang báo giá tự kiểm tra dữ liệu Google Sheet mỗi 60 giây.

## Thay đổi thời gian cập nhật

Trong `config.js`:

```js
const AUTO_REFRESH_MS = 60000;
```

- `30000` = 30 giây
- `60000` = 1 phút
- `120000` = 2 phút
- `300000` = 5 phút
