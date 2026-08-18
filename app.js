
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some(v => v.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some(v => v.trim() !== "")) rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function sheetRowsToProducts(csvRows) {
  if (csvRows.length < 2) return { left: [], right: [], date: "" };

  const headers = csvRows[0].map(normalizeHeader);
  const index = {
    col: headers.indexOf("cot"),
    product: headers.indexOf("sanpham"),
    storage: headers.indexOf("dungluong"),
    color: headers.indexOf("mau"),
    price: headers.indexOf("gia"),
    order: headers.indexOf("thutu"),
    date: headers.indexOf("ngay")
  };

  const required = ["col", "product", "storage", "color", "price"];
  const missing = required.filter(k => index[k] === -1);
  if (missing.length) {
    throw new Error(
      'Google Sheet phải có các cột: Cột, Sản phẩm, Dung lượng, Màu, Giá, Thứ tự, Ngày'
    );
  }

  const records = csvRows.slice(1).map((r, idx) => ({
    col: (r[index.col] || "").trim(),
    product: (r[index.product] || "").trim(),
    storage: (r[index.storage] || "").trim(),
    color: (r[index.color] || "").trim(),
    price: (r[index.price] || "").trim(),
    order: index.order >= 0 ? Number(r[index.order] || idx + 1) : idx + 1,
    date: index.date >= 0 ? (r[index.date] || "").trim() : ""
  })).filter(r => r.product && r.storage && r.color);

  const date = records.find(r => r.date)?.date || "";

  function build(side) {
    const filtered = records
      .filter(r => {
        const value = r.col.toLowerCase();
        return side === "left"
          ? ["trái", "trai", "left", "1"].includes(value)
          : ["phải", "phai", "right", "2"].includes(value);
      })
      .sort((a, b) => a.order - b.order);

    const products = [];
    const productMap = new Map();

    filtered.forEach(r => {
      if (!productMap.has(r.product)) {
        const product = { name: r.product, order: r.order, variants: [], variantMap: new Map() };
        productMap.set(r.product, product);
        products.push(product);
      }

      const product = productMap.get(r.product);
      if (!product.variantMap.has(r.storage)) {
        const variant = { storage: r.storage, rows: [], order: r.order };
        product.variantMap.set(r.storage, variant);
        product.variants.push(variant);
      }

      product.variantMap.get(r.storage).rows.push([r.color, r.price]);
    });

    products.forEach(p => {
      p.variants.sort((a, b) => a.order - b.order);
      delete p.variantMap;
    });

    return products;
  }

  return { left: build("left"), right: build("right"), date };
}

function chunk(items, count = 3) {
  const out = [];
  for (let i = 0; i < items.length; i += count) out.push(items.slice(i, i + count));
  return out;
}

function renderProduct(product) {
  const table = document.createElement("table");
  table.className = "product-table";

  const variants = product.variants.map(v => ({ ...v, lines: chunk(v.rows, 3) }));
  const totalRows = variants.reduce((sum, v) => sum + v.lines.length, 0);
  let namePrinted = false;

  variants.forEach(variant => {
    variant.lines.forEach((line, lineIndex) => {
      const tr = document.createElement("tr");

      if (!namePrinted) {
        const th = document.createElement("th");
        th.className = "product-name";
        th.rowSpan = totalRows;
        th.textContent = product.name;
        tr.appendChild(th);
        namePrinted = true;
      }

      if (lineIndex === 0) {
        const td = document.createElement("td");
        td.className = "variant";
        td.rowSpan = variant.lines.length;
        td.textContent = variant.storage;
        tr.appendChild(td);
      }

      for (let i = 0; i < 3; i++) {
        const td = document.createElement("td");
        td.className = "color-cell";
        const item = line[i];

        if (item) {
          const [color, price] = item;
          const colorSpan = document.createElement("span");
          colorSpan.textContent = color;
          td.appendChild(colorSpan);

          if (price) {
            const priceSpan = document.createElement("span");
            priceSpan.className = "price";
            priceSpan.textContent = price;
            td.appendChild(priceSpan);
          }
        } else {
          td.innerHTML = '<span class="empty">.</span>';
        }

        tr.appendChild(td);
      }

      table.appendChild(tr);
    });
  });

  return table;
}

function renderColumn(products) {
  const col = document.createElement("div");
  col.className = "column";
  products.forEach(p => col.appendChild(renderProduct(p)));
  return col;
}

function render(data) {
  grid.innerHTML = "";
  grid.appendChild(renderColumn(data.left));
  grid.appendChild(renderColumn(data.right));

  const today = new Date();
  const fallbackDate =
    String(today.getDate()).padStart(2, "0") + "/" +
    String(today.getMonth() + 1).padStart(2, "0") + "/" +
    today.getFullYear();

  priceDate.textContent = `PS / Báo giá ngày: ${data.date || fallbackDate}`;

  const now = new Date();
  syncStatus.classList.remove("error");
  syncStatus.textContent =
    `Đã đồng bộ Google Sheet lúc ${now.toLocaleTimeString("vi-VN")}`;
}

async function loadPrices() {
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("DAN_LINK")) {
    grid.innerHTML = `
      <div class="error-box">
        Chưa cấu hình Google Sheet.<br>
        Mở file <b>config.js</b> và dán link CSV đã Publish của Google Sheet vào biến <b>SHEET_CSV_URL</b>.
      </div>`;
    syncStatus.textContent = "Chưa có link Google Sheet";
    syncStatus.classList.add("error");
    return;
  }

  try {
    const separator = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const url = `${SHEET_CSV_URL}${separator}_=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const csvRows = parseCSV(text);
    const data = sheetRowsToProducts(csvRows);

    if (!data.left.length && !data.right.length) {
      throw new Error("Không tìm thấy dòng sản phẩm hợp lệ.");
    }

    render(data);
  } catch (error) {
    console.error(error);
    syncStatus.textContent = `Lỗi đồng bộ: ${error.message}`;
    syncStatus.classList.add("error");

    if (!grid.querySelector(".product-table")) {
      grid.innerHTML = `
        <div class="error-box">
          Không tải được dữ liệu Google Sheet.<br>
          Kiểm tra Sheet đã <b>Publish to web</b> dạng CSV và link trong <b>config.js</b> có đúng không.
        </div>`;
    }
  }
}

const savedTheme = localStorage.getItem("price-theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.checked = true;
}

themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("price-theme", themeToggle.checked ? "dark" : "light");
});

loadPrices();
setInterval(loadPrices, AUTO_REFRESH_MS);
