
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const onlyPriced = document.getElementById("onlyPriced");
const suggestions = document.getElementById("suggestions");
const floatingSearch = document.getElementById("floatingSearch");
const toolbar = document.getElementById("toolbar");

let ALL_PRODUCTS = [];

function parseCSV(text){
  const rows=[]; let row=[],cell="",q=false;

  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];

    if(c=='"'&&q&&n=='"'){
      cell+='"'; i++;
    }else if(c=='"'){
      q=!q;
    }else if(c==','&&!q){
      row.push(cell); cell="";
    }else if((c=='\n'||c=='\r')&&!q){
      if(c=='\r'&&n=='\n') i++;

      row.push(cell);

      if(row.some(x=>String(x).trim()!=="")){
        rows.push(row);
      }

      row=[]; cell="";
    }else{
      cell+=c;
    }
  }

  if(cell.length||row.length){
    row.push(cell);

    if(row.some(x=>String(x).trim()!=="")){
      rows.push(row);
    }
  }

  return rows;
}

function parsePrice(value){
  const clean=String(value||"").trim().replace(/[^\d]/g,"");
  return clean ? Number(clean) : null;
}

function formatPrice(value){
  return Math.round(value).toLocaleString("vi-VN").replaceAll(",", ".");
}

async function loadMarkupConfig(){
  const response=await fetch(`markup.js?t=${Date.now()}`,{
    cache:"no-store",
    headers:{
      "Cache-Control":"no-cache, no-store, must-revalidate",
      "Pragma":"no-cache"
    }
  });

  if(!response.ok){
    throw new Error("Không tải được cấu hình giá bán.");
  }

  const code=await response.text();
  (0,eval)(code);
}

function markupFor(model,base){
  const cfg=window.PRICE_MARKUP_CONFIG||{};
  const modelMarkup=cfg.MODEL_MARKUP||{};

  if(Object.prototype.hasOwnProperty.call(modelMarkup,model)){
    return Number(modelMarkup[model])||0;
  }

  if(cfg.USE_PRICE_TIERS){
    const tiers=Array.isArray(cfg.PRICE_TIERS)?cfg.PRICE_TIERS:[];
    const tier=tiers.find(x=>base>=x.min&&base<=x.max);

    if(tier){
      return Number(tier.add)||0;
    }
  }

  return Number(cfg.DEFAULT_MARKUP)||0;
}

function normalizeData(rows){
  if(rows.length<2) return [];

  const h=rows[0].map(x=>String(x).trim().toLowerCase());

  const modelIndex=h.indexOf("model");
  const memIndex=h.indexOf("mem");
  const colorIndex=h.indexOf("color");
  const priceIndex=h.indexOf("price");

  if([modelIndex,memIndex,colorIndex,priceIndex].some(i=>i<0)){
    throw new Error("Nguồn dữ liệu không đúng cấu trúc.");
  }

  return rows.slice(1).map(r=>{
    const model=String(r[modelIndex]||"").trim();
    const mem=String(r[memIndex]||"").trim();
    const color=String(r[colorIndex]||"").trim();
    const base=parsePrice(r[priceIndex]);

    if(!model||!mem||!color||base===null){
      return null;
    }

    return {
      model,
      mem,
      color,
      price:formatPrice(base+markupFor(model,base))
    };
  }).filter(Boolean);
}

function storageSort(a,b){
  const toNumber=s=>{
    const [ram,rom]=String(s).toLowerCase().split("/");

    const romValue=rom?.endsWith("t")
      ? parseFloat(rom)*1024
      : parseFloat(rom);

    return (parseFloat(ram)||0)*10000+(romValue||0);
  };

  return toNumber(a)-toNumber(b);
}

function buildProducts(data){
  const order=[];
  const map=new Map();

  data.forEach(item=>{
    if(!map.has(item.model)){
      map.set(item.model,new Map());
      order.push(item.model);
    }

    const modelMap=map.get(item.model);

    if(!modelMap.has(item.mem)){
      modelMap.set(item.mem,[]);
    }

    modelMap.get(item.mem).push([item.color,item.price]);
  });

  return order.map(name=>({
    name,
    variants:[...map.get(name).entries()]
      .sort((a,b)=>storageSort(a[0],b[0]))
      .map(([storage,rows])=>({
        storage,
        rows:rows.sort((a,b)=>a[0].localeCompare(b[0],"vi"))
      }))
  }));
}

function colorDot(name){
  const s=String(name||"").toLowerCase();

  if(s.includes("đen")||s.includes("black")) return "#111827";
  if(s.includes("trắng")||s.includes("white")) return "#f8fafc";
  if(s.includes("đỏ")||s.includes("red")) return "#ef233c";
  if(s.includes("hồng")||s.includes("pink")) return "#ec6bb3";
  if(s.includes("tím")||s.includes("purple")) return "#a855f7";
  if(s.includes("xanh")||s.includes("green")) return "#65a30d";
  if(s.includes("blue")) return "#2563eb";
  if(s.includes("green")) return "#65a30d";
  if(s.includes("bạc")||s.includes("silver")) return "#cbd5e1";
  if(s.includes("titan")) return "#8b8f97";
  if(s.includes("vàng")||s.includes("gold")) return "#d4a017";
  if(s.includes("cam")||s.includes("orange")) return "#f97316";

  return "#94a3b8";
}

function isMobile(){
  return window.matchMedia("(max-width: 900px)").matches;
}

function renderProductCard(product){
  const card=document.createElement("article");
  card.className="product-card";
  card.dataset.model=product.name;

  if(isMobile()){
    card.classList.add("mobile-default-collapsed");
  }

  const header=document.createElement("div");
  header.className="product-header";

  const name=document.createElement("div");
  name.className="product-name";
  name.textContent=product.name;

  const chevron=document.createElement("div");
  chevron.className="chevron";
  chevron.textContent="⌄";

  header.appendChild(name);
  header.appendChild(chevron);

  header.addEventListener("click",()=>{
    if(isMobile()){
      card.classList.toggle("mobile-open");
    }else{
      card.classList.toggle("collapsed");
    }
  });

  const body=document.createElement("div");
  body.className="product-body";

  product.variants.forEach(variant=>{
    const row=document.createElement("section");
    row.className="variant-row";

    const storageWrap=document.createElement("div");
    storageWrap.className="storage-wrap";

    const badge=document.createElement("span");
    badge.className="storage-badge";
    badge.textContent=variant.storage;

    storageWrap.appendChild(badge);

    const colors=document.createElement("div");
    colors.className="colors-grid";

    variant.rows.forEach(([color,price])=>{
      if(onlyPriced.checked && !price){
        return;
      }

      const cell=document.createElement("div");
      cell.className="price-cell";

      const colorLine=document.createElement("div");
      colorLine.className="color-line";

      const dot=document.createElement("span");
      dot.className="color-dot";
      dot.style.background=colorDot(color);

      const label=document.createElement("span");
      label.textContent=color;

      colorLine.appendChild(dot);
      colorLine.appendChild(label);

      const priceEl=document.createElement("span");
      priceEl.className="price";
      priceEl.textContent=price;

      cell.appendChild(colorLine);
      cell.appendChild(priceEl);

      colors.appendChild(cell);
    });

    if(colors.children.length){
      row.appendChild(storageWrap);
      row.appendChild(colors);
      body.appendChild(row);
    }
  });

  card.appendChild(header);
  card.appendChild(body);

  return card;
}

function renderProducts(products){
  grid.innerHTML="";

  if(!products.length){
    grid.innerHTML='<div class="error-box">Không tìm thấy sản phẩm phù hợp.</div>';
    return;
  }

  if(isMobile()){
    const col=document.createElement("div");
    col.className="column";

    products.forEach(product=>{
      col.appendChild(renderProductCard(product));
    });

    grid.appendChild(col);
    return;
  }

  const split=Math.ceil(products.length/2);
  const groups=[
    products.slice(0,split),
    products.slice(split)
  ];

  groups.forEach(group=>{
    const col=document.createElement("div");
    col.className="column";

    group.forEach(product=>{
      col.appendChild(renderProductCard(product));
    });

    grid.appendChild(col);
  });
}

function applyFilters(){
  const q=searchInput.value.trim().toLowerCase();

  const filtered=ALL_PRODUCTS.filter(product=>{
    return !q||product.name.toLowerCase().includes(q);
  });

  renderProducts(filtered);
}

function updateSuggestions(){
  const q=searchInput.value.trim().toLowerCase();

  if(!q){
    suggestions.classList.remove("show");
    suggestions.innerHTML="";
    return;
  }

  const matches=ALL_PRODUCTS
    .filter(p=>p.name.toLowerCase().includes(q))
    .slice(0,10);

  suggestions.innerHTML="";

  matches.forEach(product=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="suggestion-item";
    btn.textContent=product.name;

    btn.addEventListener("click",()=>{
      searchInput.value=product.name;
      suggestions.classList.remove("show");
      renderProducts([product]);

      requestAnimationFrame(()=>{
        const card=grid.querySelector(".product-card");

        if(card){
          if(isMobile()){
            card.classList.add("mobile-open");
          }

          card.scrollIntoView({
            behavior:"smooth",
            block:"start"
          });
        }
      });
    });

    suggestions.appendChild(btn);
  });

  if(matches.length){
    suggestions.classList.add("show");
  }else{
    suggestions.classList.remove("show");
  }
}

async function load(){
  try{
    await loadMarkupConfig();

    const url=
      `https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq`+
      `?tqx=out:csv&tq&gid=${SOURCE_GID}&range=A:D&headers=1&_=${Date.now()}`;

    const res=await fetch(url,{
      cache:"no-store"
    });

    if(!res.ok){
      throw new Error("HTTP "+res.status);
    }

    const data=normalizeData(parseCSV(await res.text()));

    if(!data.length){
      throw new Error("Không lấy được bảng giá.");
    }

    ALL_PRODUCTS=buildProducts(data);
    applyFilters();

    const now=new Date();

    priceDate.textContent=
      `PS / BÁO GIÁ NGÀY: ${now.toLocaleDateString("vi-VN")}`;

    syncStatus.textContent=
      `Cập nhật lúc ${now.toLocaleTimeString("vi-VN")}`;

  }catch(error){
    console.error(error);

    syncStatus.textContent="Không thể cập nhật dữ liệu";

    grid.innerHTML=
      `<div class="error-box">Không tải được bảng giá.<br>${error.message}</div>`;
  }
}

searchInput.addEventListener("input",()=>{
  applyFilters();
  updateSuggestions();
});

searchInput.addEventListener("focus",()=>{
  updateSuggestions();
});

document.addEventListener("click",event=>{
  if(!event.target.closest(".search-wrap")){
    suggestions.classList.remove("show");
  }
});

onlyPriced.addEventListener("change",applyFilters);

floatingSearch.addEventListener("click",()=>{
  toolbar.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });

  setTimeout(()=>{
    searchInput.focus();
    searchInput.select();
  },350);
});

const savedTheme=localStorage.getItem("price-theme");

if(savedTheme==="dark"){
  document.body.classList.add("dark");
  themeToggle.checked=true;
}

themeToggle.addEventListener("change",()=>{
  document.body.classList.toggle("dark",themeToggle.checked);

  localStorage.setItem(
    "price-theme",
    themeToggle.checked ? "dark" : "light"
  );
});

window.addEventListener("resize",()=>{
  applyFilters();
});

load();
setInterval(load,AUTO_REFRESH_MS);
