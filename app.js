
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const brandFilters = document.getElementById("brandFilters");
const onlyPriced = document.getElementById("onlyPriced");

let ALL_PRODUCTS = [];
let ACTIVE_BRAND = "Tất cả";

function parseCSV(text){
  const rows=[]; let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c=='"'&&q&&n=='"'){cell+='"';i++}
    else if(c=='"'){q=!q}
    else if(c==','&&!q){row.push(cell);cell=""}
    else if((c=='\n'||c=='\r')&&!q){
      if(c=='\r'&&n=='\n')i++;
      row.push(cell);
      if(row.some(x=>String(x).trim()!==""))rows.push(row);
      row=[];cell="";
    }else cell+=c;
  }
  if(cell.length||row.length){
    row.push(cell);
    if(row.some(x=>String(x).trim()!==""))rows.push(row)
  }
  return rows;
}

function fmtPrice(n){
  return Math.round(n).toLocaleString("vi-VN").replaceAll(",", ".");
}

function parsePrice(s){
  const clean=String(s||"").trim().replace(/[^\d]/g,"");
  return clean ? Number(clean) : null;
}

function markupFor(model, base){
  if(Object.prototype.hasOwnProperty.call(MODEL_MARKUP, model)){
    return Number(MODEL_MARKUP[model])||0;
  }
  if(USE_PRICE_TIERS){
    const t=PRICE_TIERS.find(x=>base>=x.min&&base<=x.max);
    if(t) return Number(t.add)||0;
  }
  return Number(DEFAULT_MARKUP)||0;
}

function normalizeData(rows){
  if(rows.length<2) return [];
  const h=rows[0].map(x=>String(x).trim().toLowerCase());
  const mi=h.indexOf("model"), memi=h.indexOf("mem"), ci=h.indexOf("color"), pi=h.indexOf("price");
  if([mi,memi,ci,pi].some(i=>i<0)) throw new Error("Nguồn không đúng cấu trúc model/mem/color/price.");

  return rows.slice(1).map(r=>{
    const model=String(r[mi]||"").trim();
    const mem=String(r[memi]||"").trim();
    const color=String(r[ci]||"").trim();
    const base=parsePrice(r[pi]);
    if(!model||!mem||!color||base===null) return null;
    const add=markupFor(model,base);
    return {model,mem,color,price:fmtPrice(base+add)};
  }).filter(Boolean);
}

function storageSort(a,b){
  const f=s=>{
    const [ram,rom]=String(s).toLowerCase().split("/");
    const rv=rom?.endsWith("t")?parseFloat(rom)*1024:parseFloat(rom);
    return (parseFloat(ram)||0)*10000+(rv||0);
  };
  return f(a)-f(b);
}

function brandOf(name){
  const s=name.toLowerCase();
  if(s.includes("iqoo")) return "iQOO";
  if(s.includes("x200") || s.includes("vivo")) return "vivo";
  if(s.includes("oppo")) return "OPPO";
  if(s.includes("oneplus")) return "OnePlus";
  if(s.includes("honor")) return "HONOR";
  if(s.includes("redmi") || s.includes("xiaomi") || s.startsWith("mi ")) return "Xiaomi";
  return "Khác";
}

function buildProducts(data){
  const modelOrder=[];
  const map=new Map();

  for(const x of data){
    if(!map.has(x.model)){
      map.set(x.model,new Map());
      modelOrder.push(x.model);
    }
    const mm=map.get(x.model);
    if(!mm.has(x.mem)) mm.set(x.mem,[]);
    mm.get(x.mem).push([x.color,x.price]);
  }

  return modelOrder.map(name=>({
    name,
    brand:brandOf(name),
    variants:[...map.get(name).entries()]
      .sort((a,b)=>storageSort(a[0],b[0]))
      .map(([storage,rows])=>({
        storage,
        rows:rows.sort((a,b)=>a[0].localeCompare(b[0],"vi"))
      }))
  }));
}

function renderBrandFilters(products){
  const brands=["Tất cả", ...new Set(products.map(p=>p.brand))];
  brandFilters.innerHTML="";

  brands.forEach(brand=>{
    const btn=document.createElement("button");
    btn.className="brand-btn"+(brand===ACTIVE_BRAND?" active":"");
    btn.textContent=brand;
    btn.addEventListener("click",()=>{
      ACTIVE_BRAND=brand;
      renderBrandFilters(ALL_PRODUCTS);
      applyFilters();
    });
    brandFilters.appendChild(btn);
  });
}

function renderProductCard(product){
  const card=document.createElement("article");
  card.className="product-card";

  const title=document.createElement("div");
  title.className="product-title";
  title.textContent=product.name;
  card.appendChild(title);

  product.variants.forEach(v=>{
    const block=document.createElement("section");
    block.className="variant-block";

    const head=document.createElement("div");
    head.className="variant-head";

    const badge=document.createElement("span");
    badge.className="storage-badge";
    badge.textContent=v.storage;
    head.appendChild(badge);

    block.appendChild(head);

    const vg=document.createElement("div");
    vg.className="variant-grid";

    v.rows.forEach(([color,price])=>{
      if(onlyPriced.checked && !price) return;

      const cell=document.createElement("div");
      cell.className="price-cell";

      const c=document.createElement("div");
      c.className="color";
      c.textContent=color;

      const p=document.createElement("span");
      p.className="price";
      p.textContent=price;

      cell.appendChild(c);
      cell.appendChild(p);
      vg.appendChild(cell);
    });

    if(vg.children.length){
      block.appendChild(vg);
      card.appendChild(block);
    }
  });

  return card;
}

function renderProducts(products){
  grid.innerHTML="";

  if(!products.length){
    grid.innerHTML='<div class="error-box">Không tìm thấy sản phẩm phù hợp.</div>';
    return;
  }

  const split=Math.ceil(products.length/2);
  const groups=[products.slice(0,split),products.slice(split)];

  groups.forEach(group=>{
    const col=document.createElement("div");
    col.className="column";
    group.forEach(p=>col.appendChild(renderProductCard(p)));
    grid.appendChild(col);
  });
}

function applyFilters(){
  const q=searchInput.value.trim().toLowerCase();

  const filtered=ALL_PRODUCTS.filter(p=>{
    const brandOk=ACTIVE_BRAND==="Tất cả" || p.brand===ACTIVE_BRAND;
    const searchOk=!q || p.name.toLowerCase().includes(q);
    return brandOk && searchOk;
  });

  renderProducts(filtered);
}

async function load(){
  try{
    const url=`https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq?tqx=out:csv&tq&gid=${SOURCE_GID}&range=A:D&headers=1&_=${Date.now()}`;
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok)throw new Error("HTTP "+res.status);

    const data=normalizeData(parseCSV(await res.text()));
    if(!data.length)throw new Error("Không lấy được bảng giá.");

    ALL_PRODUCTS=buildProducts(data);
    renderBrandFilters(ALL_PRODUCTS);
    applyFilters();

    const now=new Date();
    priceDate.textContent=`PS / Báo giá ngày: ${now.toLocaleDateString("vi-VN")}`;
    syncStatus.textContent=`Cập nhật lúc ${now.toLocaleTimeString("vi-VN")}`;
  }catch(e){
    console.error(e);
    syncStatus.textContent="Không thể cập nhật dữ liệu";
    grid.innerHTML=`<div class="error-box">Không tải được bảng giá.<br>${e.message}</div>`;
  }
}

searchInput.addEventListener("input",applyFilters);
onlyPriced.addEventListener("change",applyFilters);

const saved=localStorage.getItem("price-theme");
if(saved==="dark"){
  document.body.classList.add("dark");
  themeToggle.checked=true;
}
themeToggle.addEventListener("change",()=>{
  document.body.classList.toggle("dark",themeToggle.checked);
  localStorage.setItem("price-theme",themeToggle.checked?"dark":"light");
});

load();
setInterval(load,AUTO_REFRESH_MS);
