// ===== CHỈNH LỢI NHUẬN Ở ĐÂY =====
//
// Đơn vị: NGHÌN ĐỒNG.
// Ví dụ giá nguồn 23.823:
// +500  => 24.323
// +300  => 24.123
//
// Mức cộng mặc định cho tất cả sản phẩm:
const DEFAULT_MARKUP = 500;

// Có thể cộng riêng từng model.
// Model không có trong danh sách này sẽ dùng DEFAULT_MARKUP.
// Ví dụ:
// "Mi 17 Ultra": 700,
// "X200 Ultra": 400,
const MODEL_MARKUP = {
};

// Có thể cộng riêng theo khoảng giá nguồn (tùy chọn).
// Nếu muốn dùng theo khoảng giá thì đặt USE_PRICE_TIERS = true.
// min/max cũng tính theo NGHÌN ĐỒNG.
const USE_PRICE_TIERS = false;
const PRICE_TIERS = [
  { min: 0,     max: 9999,  add: 300 },
  { min: 10000, max: 14999, add: 400 },
  { min: 15000, max: 19999, add: 500 },
  { min: 20000, max: 99999, add: 700 },
];

// Bảng nguồn mà trang cũ đang dùng:
const SOURCE_SHEET_ID = "1B0lsfTAz0T2YL2-J5D3ufloYwqlJeZbdqxn06VRbTno";
const SOURCE_GID = "731021545";

// Tự cập nhật mỗi 60 giây:
const AUTO_REFRESH_MS = 60000;
