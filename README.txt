BẢNG GIÁ TỰ ĐỘNG TỪ NGUỒN CŨ

Website đọc trực tiếp dữ liệu nguồn của trang:
https://quang1412.github.io/price_table_ps/?gid=731021545

Không cần nhập lại giá.

MẶC ĐỊNH:
- cộng 500.000đ vào mọi giá nguồn.

ĐỔI LÃI:
Mở config.js và sửa:
const DEFAULT_MARKUP = 500;

Ví dụ:
300 = +300.000đ
500 = +500.000đ
1000 = +1.000.000đ

CỘNG RIÊNG TỪNG MODEL:
const MODEL_MARKUP = {
  "Mi 17 Ultra": 700,
  "X200 Ultra": 400,
};

CỘNG THEO KHOẢNG GIÁ:
Đổi USE_PRICE_TIERS = true và sửa PRICE_TIERS.

UPLOAD:
Thay 4 file trong GitHub repo bao-gia:
index.html
styles.css
config.js
app.js
