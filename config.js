// ===== CẤU HÌNH LỢI NHUẬN =====
// Đơn vị: nghìn đồng.
// 500 = +500.000đ

const DEFAULT_MARKUP = 100;

// Muốn cộng riêng từng model thì ghi ở đây.
// Ví dụ:
// "Mi 17 Ultra": 700,
// "X200 Ultra": 400,
const MODEL_MARKUP = {
};

// Nếu muốn cộng theo khoảng giá thì đổi thành true.
const USE_PRICE_TIERS = false;

const PRICE_TIERS = [
  { min: 0,     max: 9999,  add: 300 },
  { min: 10000, max: 14999, add: 400 },
  { min: 15000, max: 19999, add: 500 },
  { min: 20000, max: 99999, add: 700 },
];

// Nguồn bảng giá
const SOURCE_SHEET_ID = "1B0lsfTAz0T2YL2-J5D3ufloYwqlJeZbdqxn06VRbTno";
const SOURCE_GID = "731021545";

// Tự cập nhật mỗi 60 giây
const AUTO_REFRESH_MS = 60000;
