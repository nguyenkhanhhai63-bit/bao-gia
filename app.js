
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");

function parseDelimited(text) {
  // Google Sheet của bạn đang publish TSV.
  // Hàm này vẫn tự nhận CSV nếu sau này đổi định dạng.
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  if (delimiter === "\t") {
    return text
      .split(/\r?\n/)
      .map(line => line.split("\t"))
      .filter(row => row.some(v => String(v).trim() !== ""));
  }

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
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function isStorageHeader(h) {
  return /^\d+\/(\d+|1t|2t)$/i.test(String(h || "").trim());
}

function matrixToProducts(rows) {
  if (rows.length < 2) throw new Error("Google Sheet chưa có dữ liệu.");

  const headers = rows[0].map(v => String(v || "").trim());
  const nh = headers.map(norm);

  const idx = {
    col: nh.indexOf("cot"),
    order: nh.indexOf("thutu"),
    product: nh.indexOf("sanpham"),
    color: nh.indexOf("mau"),
    date: nh.indexOf("ngay")
  };

  if (idx.col < 0 || idx.product < 0 || idx.color < 0) {
    throw new Error("Sheet phải có cột: Cột, Thứ tự, Sản phẩm, Màu, các cột dung lượng, Ngày.");
  }

  const storageCols = headers
    .map((h, i) => ({h: h.trim(), i}))
    .filter(x => isStorageHeader(x.h));

  if (!storageCols.length) {
    throw new Error("Không tìm thấy cột dung lượng như 12/256, 12/512, 16/512...");
  }

  const records = [];

  rows.slice(1).forEach((r, rowIndex) => {
    const side = String(r[idx.col] || "").trim();
    const product = String(r[idx.product] || "").trim();
    const color = String(r[idx.color] || "").trim();
    const order = idx.order >= 0 ? Number(r[idx.order] || rowIndex + 1) : rowIndex + 1;
    const date = idx.date >= 0 ? String(r[idx.date] || "").trim() : "";

    if (!side || !product || !color) return;

    storageCols.forEach(sc => {
      const price = String(r[sc.i] || "").trim();
      if (!price) return;

      records.push({
        side, product, color,
        storage: sc.h,
        price, order, date
      });
    });
  });

  function build(sideName) {
    const validSides = sideName === "left"
      ? ["trai", "left", "1"]
      : ["phai", "right", "2"];

    const list = records
      .filter(r => validSides.includes(norm(r.side)))
      .sort((a,b) => a.order - b.order);

    const pmap = new Map();

    for (const r of list) {
      if (!pmap.has(r.product)) {
        pmap.set(r.product, {
          name: r.product,
          order: r.order,
          variants: [],
          vmap: new Map()
        });
      }

      const p = pmap.get(r.product);

      if (!p.vmap.has(r.storage)) {
        const v = {storage: r.storage, rows: []};
        p.vmap.set(r.storage, v);
        p.variants.push(v);
      }

      p.vmap.get(r.storage).rows.push([r.color, r.price]);
    }

    return [...pmap.values()]
      .sort((a,b) => a.order - b.order)
      .map(p => {
        p.variants.sort((a,b) => {
          const conv = s => {
            const [ram, rom] = s.toLowerCase().split("/");
            const rv = rom.endsWith("t") ? parseFloat(rom) * 1024 : parseFloat(rom);
            return parseFloat(ram) * 10000 + rv;
          };
          return conv(a.storage) - conv(b.storage);
        });
        delete p.vmap;
        return p;
      });
  }

  return {
    left: build("left"),
    right: build("right"),
    date: records.find(r => r.date)?.date || ""
  };
}

function chunk(items, count=3) {
  const out = [];
  for (let i=0; i<items.length; i+=count) out.push(items.slice(i, i+count));
  return out;
}

function renderProduct(product) {
  const table = document.createElement("table");
  table.className = "product-table";

  const variants = product.variants.map(v => ({...v, lines: chunk(v.rows, 3)}));
  const totalRows = variants.reduce((sum, v) => sum + v.lines.length, 0);
  let productPrinted = false;

  variants.forEach(v => {
    v.lines.forEach((line, lineIndex) => {
      const tr = document.createElement("tr");

      if (!productPrinted) {
        const th = document.createElement("th");
        th.className = "product-name";
        th.rowSpan = totalRows;
        th.textContent = product.name;
        tr.appendChild(th);
        productPrinted = true;
      }

      if (lineIndex === 0) {
        const td = document.createElement("td");
        td.className = "variant";
        td.rowSpan = v.lines.length;
        td.textContent = v.storage;
        tr.appendChild(td);
      }

      for (let i=0; i<3; i++) {
        const td = document.createElement("td");
        td.className = "color-cell";
        const item = line[i];

        if (item) {
          const c = document.createElement("span");
          c.textContent = item[0];
          td.appendChild(c);

          const p = document.createElement("span");
          p.className = "price";
          p.textContent = item[1];
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

  const now = new Date();
  const fallback =
    String(now.getDate()).padStart(2,"0") + "/" +
    String(now.getMonth()+1).padStart(2,"0") + "/" +
    now.getFullYear();

  priceDate.textContent = `PS / Báo giá ngày: ${data.date || fallback}`;
  syncStatus.classList.remove("error");
  syncStatus.textContent = `Đã đồng bộ Google Sheet lúc ${now.toLocaleTimeString("vi-VN")}`;
}

async function loadPrices() {
  try {
    const sep = SHEET_DATA_URL.includes("?") ? "&" : "?";
    const url = `${SHEET_DATA_URL}${sep}_=${Date.now()}`;

    const res = await fetch(url, {cache: "no-store"});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseDelimited(text);
    const data = matrixToProducts(rows);

    if (!data.left.length && !data.right.length) {
      throw new Error("Không có sản phẩm hợp lệ. Kiểm tra cột Trái/Phải và các ô giá.");
    }

    render(data);
  } catch (err) {
    console.error(err);
    syncStatus.classList.add("error");
    syncStatus.textContent = `Lỗi đồng bộ: ${err.message}`;

    if (!grid.querySelector(".product-table")) {
      grid.innerHTML = `<div class="error-box">
        Không tải được dữ liệu Google Sheet.<br>
        ${err.message}
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
