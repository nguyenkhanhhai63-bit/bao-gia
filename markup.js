// ===== CHỈNH LÃI TẠI FILE NÀY =====
// Đơn vị: nghìn đồng.
// Ví dụ 100 = +100.000đ, 500 = +500.000đ.
//
// Sau khi sửa trên GitHub và Commit changes:
// Website đang mở sẽ tự kiểm tra lại file này mỗi 60 giây.
// Không cần đổi ?v= và không cần khách F5.

window.PRICE_MARKUP_CONFIG = {
  DEFAULT_MARKUP: 200,

  MODEL_MARKUP: {

  },

  USE_PRICE_TIERS: false,

  PRICE_TIERS: [
  { min: 0,     max: 9999,  add: 300 },
  { min: 10000, max: 14999, add: 400 },
  { min: 15000, max: 19999, add: 500 },
  { min: 20000, max: 99999, add: 700 },

  ]
};
