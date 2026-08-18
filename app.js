
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"'; i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some(v => String(v).trim() !== "")) rows.push(row);
      row = []; cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some(v => String(v).trim() !== "")) rows.push(row);
  }
  return rows;
}

function norm(v) {
  return String(v || "")
    .trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function sheetRowsToProducts(csvRows) {
  if (csvRows.length < 2) return { left: [], right: [], date: "" };

  const headersRaw = csvRows[0].map(v => String(v || "").trim());
  const headers = headersRaw.map(norm);

  const idx = {
    col: headers.indexOf("cot"),
    product: headers.indexOf("sanpham"),
    color: headers.indexOf("mau"),
    order: headers.indexOf("thutu"),
    date: headers.indexOf("ngay")
  };

  if ([idx.col, idx.product, idx.color].some(v => v === -1)) {
    throw new Error("Sheet cần có các cột: Cột, Sản phẩm, Màu, các cột Dung lượng, Thứ tự, Ngày.");
  }

  // Mọi cột nằm giữa Màu và Thứ tự/Ngày đều được xem là dung lượng.
  const stopCandidates = [idx.order, idx.date].filter(v => v >= 0);
  const storageEnd = stopCandidates.length ? Math.min(...stopCandidates) : headersRaw.length;
  const storageCols = [];

  for (let i = idx.color + 1; i < storageEnd; i++) {
    if (headersRaw[i]) storageCols.push({ index: i, storage: headersRaw[i] });
  }

  if (!storageCols.length) throw new Error("Chưa có cột dung lượng nào.");

  let currentCol = "", currentProduct = "", currentOrder = 9999, currentDate = "";
  const records = [];

  csvRows.slice(1).forEach((r, rowIndex) => {
    const rawCol = (r[idx.col] || "").trim();
    const rawProduct = (r[idx.product] || "").trim();
    const color = (r[idx.color] || "").trim();

    if (rawCol) currentCol = rawCol;
    if (rawProduct) currentProduct = rawProduct;
    if (idx.order >= 0 && String(r[idx.order] || "").trim() !== "") {
      currentOrder = Number(r[idx.order]) || rowIndex + 1;
    }
    if (idx.date >= 0 && String(r[idx.date] || "").trim() !== "") {
      currentDate = String(r[idx.date]).trim();
    }

    if (!currentProduct || !color) return;

    storageCols.forEach(sc => {
      const price = String(r[sc.index] || "").trim();
      if (price) {
        records.push({
          col: currentCol,
          product: currentProduct,
          color,
          storage: sc.storage,
          price,
          order: currentOrder,
          date: currentDate
        });
      }
    });
  });

  const date = records.find(r => r.date)?.date || "";

  function build(side) {
    const sideValues = side === "left"
      ? ["trái", "trai", "left", "1"]
      : ["phải", "phai", "right", "2"];

    const filtered = records
      .filter(r => sideValues.includes(r.col.toLowerCase()))
      .sort((a, b) => a.order - b.order);

    const products = [];
    const productMap = new Map();

    filtered.forEach(r => {
      if (!productMap.has(r.product)) {
        const p = { name: r.product, order: r.order, variants: [], variantMap: new Map() };
        productMap.set(r.product, p);
        products.push(p);
      }

      const p = productMap.get(r.product);
      if (!p.variantMap.has(r.storage)) {
        const v = { storage: r.storage, rows: [], order: storageCols.findIndex(s => s.storage === r.storage) };
        p.variantMap.set(r.storage, v);
        p.variants.push(v);
      }

      p.variantMap.get(r.storage).rows.push([r.color, r.price]);
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
          const c = document.createElement("span");
          c.textContent = color;
          td.appendChild(c);

          const p = document.createElement("span");
          p.className = "price";
          p.textContent = price;
          td.appendChild(p);
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

  const d = new Date();
  const fallback = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  priceDate.textContent = `PS / Báo giá ngày: ${data.date || fallback}`;

  syncStatus.classList.remove("error");
  syncStatus.textContent = `Đã đồng bộ Google Sheet lúc ${new Date().toLocaleTimeString("vi-VN")}`;
}

async function loadPrices() {
  try {
    const sep = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const res = await fetch(`${SHEET_CSV_URL}${sep}_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = sheetRowsToProducts(parseCSV(await res.text()));
    if (!data.left.length && !data.right.length) throw new Error("Không tìm thấy giá hợp lệ trong Sheet.");
    render(data);
  } catch (e) {
    console.error(e);
    syncStatus.textContent = `Lỗi đồng bộ: ${e.message}`;
    syncStatus.classList.add("error");
    if (!grid.querySelector(".product-table")) {
      grid.innerHTML = `<div class="error-box">Không tải được dữ liệu Google Sheet.<br>${e.message}</div>`;
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
