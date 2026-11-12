
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
let REFRESHING = false;

const CACHE_KEY = "noibo-price-cache-v2";
const CACHE_MAX_AGE = 6 * 60 * 60 * 1000; // 6 giờ

// Lịch sử lưu tại trình duyệt đang sử dụng, không đồng bộ giữa thiết bị.
const HISTORY_KEY="ps-price-history-v1";
const HISTORY_LIMIT=1500;
const changeFilter=document.getElementById("changeFilter");
const comparePeriod=document.getElementById("comparePeriod");
const changeSummary=document.getElementById("changeSummary");
const historyDialog=document.getElementById("historyDialog");
let PRICE_HISTORY=readHistory();
function readHistory(){try{const v=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}}
function itemKey(model,mem,color){return JSON.stringify([model.trim().toLowerCase(),mem.trim().toLowerCase(),color.trim().toLowerCase()])}
function snapshotMap(products){const map={};products.forEach(p=>p.variants.forEach(v=>v.rows.forEach(([c,price])=>{if(price){const n=parsePrice(price);if(n!==null)map[itemKey(p.name,v.storage,c)]=n}})));return map}
function recordHistory(products){
  const prices=snapshotMap(products),now=Date.now(),last=PRICE_HISTORY.at(-1);
  if(last&&JSON.stringify(last.prices)===JSON.stringify(prices))return;
  // Không ghi lại các lần tải trùng; giữ mọi lần giá thực sự thay đổi.
  PRICE_HISTORY.push({time:now,prices});
  // Giữ bản ghi cuối mỗi ngày và các lần cập nhật gần đây để hạn chế đầy bộ nhớ.
  if(PRICE_HISTORY.length>HISTORY_LIMIT){
    const old=PRICE_HISTORY.slice(0,-500),keep=new Map();
    old.forEach(x=>keep.set(localDay(x.time),x));
    PRICE_HISTORY=[...keep.values(),...PRICE_HISTORY.slice(-500)];
  }
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(PRICE_HISTORY))}catch(e){console.warn("Không lưu được lịch sử giá",e)}
}
function localDay(time){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function baseline(){
  const period=comparePeriod.value;
  if(period==="previous")return PRICE_HISTORY.length>=2?PRICE_HISTORY[PRICE_HISTORY.length-2]:null;
  const today=new Date();today.setHours(0,0,0,0);
  const days=period==="yesterday"?1:Number(period);
  const target=new Date(today);target.setDate(target.getDate()-days);
  const key=localDay(target.getTime());
  // Lấy giá ghi nhận cuối cùng trong đúng ngày được chọn, không dùng ngày khác thay thế.
  return [...PRICE_HISTORY].reverse().find(x=>localDay(x.time)===key)||null;
}
function priceChange(model,storage,color,price){
  if(!price)return {type:"new",delta:null};
  const base=baseline(),key=itemKey(model,storage,color);
  if(!base||!Object.prototype.hasOwnProperty.call(base.prices,key))return {type:"new",delta:null};
  const delta=parsePrice(price)-base.prices[key];
  return {type:delta>0?"up":delta<0?"down":"same",delta};
}
function showHistory(model,storage,color){
  document.getElementById("historyTitle").textContent=`${model} · ${storage} · ${color}`;
  const target=document.getElementById("historyContent");target.replaceChildren();
  const key=itemKey(model,storage,color);
  const rows=PRICE_HISTORY.filter(x=>Object.prototype.hasOwnProperty.call(x.prices,key)).reverse();
  if(!rows.length){target.textContent="Chưa có lịch sử giá trên thiết bị này."}
  else{
    const note=document.createElement("p");note.className="history-note";note.textContent="Lịch sử giá ghi nhận trên trình duyệt này (mới nhất ở trên).";target.append(note);
    rows.forEach((x,i)=>{const div=document.createElement("div");div.className="history-row";const date=document.createElement("span");date.textContent=new Date(x.time).toLocaleString("vi-VN");const value=document.createElement("strong");value.textContent=formatPrice(x.prices[key]);div.append(date,value);target.append(div)})
  }
  if(!historyDialog.open)historyDialog.showModal();
}
document.getElementById("closeHistory").addEventListener("click",()=>historyDialog.close());
historyDialog.addEventListener("click",e=>{if(e.target===historyDialog)historyDialog.close()});
changeFilter.addEventListener("change",applyFilters);
comparePeriod.addEventListener("change",applyFilters);

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
    if(row.some(x=>String(x).trim()!==""))rows.push(row);
  }
  return rows;
}

function parsePrice(value){
  const clean=String(value||"").trim().replace(/[^\d]/g,"");
  return clean?Number(clean):null;
}

function formatPrice(value){
  return Math.round(value).toLocaleString("vi-VN").replaceAll(",",".");
}

async function fetchText(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(url,{
      cache:"no-store",
      signal:controller.signal,
      headers:{
        "Cache-Control":"no-cache, no-store, must-revalidate",
        "Pragma":"no-cache"
      }
    });
    if(!res.ok)throw new Error("HTTP "+res.status);
    return await res.text();
  }finally{
    clearTimeout(timeout);
  }
}

function normalizeData(rows){
  if(rows.length<2)return [];
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

    // Vẫn giữ dòng sản phẩm/màu dù chưa có giá.
    // Khi "Chỉ hiện hàng có giá" được bật thì giao diện mới ẩn các dòng này.
    if(!model||!mem||!color)return null;

    return {
      model,
      mem,
      color,
      price: base===null ? "" : formatPrice(base)
    };
  }).filter(Boolean);
}

function storageSort(a,b){
  const toNumber=s=>{
    const [ram,rom]=String(s).toLowerCase().split("/");
    const romValue=rom?.endsWith("t")?parseFloat(rom)*1024:parseFloat(rom);
    return (parseFloat(ram)||0)*10000+(romValue||0);
  };
  return toNumber(a)-toNumber(b);
}

function buildProducts(data){
  const order=[];
  const map=new Map();
  data.forEach(item=>{
    if(!map.has(item.model)){map.set(item.model,new Map());order.push(item.model);}
    const m=map.get(item.model);
    if(!m.has(item.mem))m.set(item.mem,[]);
    m.get(item.mem).push([item.color,item.price]);
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
  if(s.includes("đen")||s.includes("black"))return "#111827";
  if(s.includes("trắng")||s.includes("white"))return "#f8fafc";
  if(s.includes("đỏ")||s.includes("red"))return "#ef233c";
  if(s.includes("hồng")||s.includes("pink"))return "#ec6bb3";
  if(s.includes("tím")||s.includes("purple"))return "#a855f7";
  if(s.includes("xanh")||s.includes("green"))return "#65a30d";
  if(s.includes("blue"))return "#2563eb";
  if(s.includes("bạc")||s.includes("silver"))return "#cbd5e1";
  if(s.includes("titan"))return "#8b8f97";
  if(s.includes("vàng")||s.includes("gold"))return "#d4a017";
  if(s.includes("cam")||s.includes("orange"))return "#f97316";
  return "#94a3b8";
}

function isMobile(){
  return window.matchMedia("(max-width:900px)").matches;
}

function renderProductCard(product){
  const card=document.createElement("article");
  card.className="product-card";
  card.dataset.model=product.name;

  if(isMobile())card.classList.add("mobile-default-collapsed");

  const header=document.createElement("div");
  header.className="product-header";

  const name=document.createElement("div");
  name.className="product-name";
  name.textContent=product.name;

  const chevron=document.createElement("div");
  chevron.className="chevron";
  chevron.textContent="⌄";

  header.append(name,chevron);
  header.addEventListener("click",()=>{
    if(isMobile())card.classList.toggle("mobile-open");
    else card.classList.toggle("collapsed");
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
      if(onlyPriced.checked&&!price)return;

      const cell=document.createElement("div");
      cell.className="price-cell";

      const colorLine=document.createElement("div");
      colorLine.className="color-line";

      const dot=document.createElement("span");
      dot.className="color-dot";
      dot.style.background=colorDot(color);

      const label=document.createElement("span");
      label.textContent=color;

      colorLine.append(dot,label);

      const priceEl=document.createElement("span");
      priceEl.className="price";
      priceEl.textContent=price || "—";
      if(!price) priceEl.classList.add("no-price");

      const change=priceChange(product.name,variant.storage,color,price);
      if(changeFilter.value!=="all"&&change.type!==changeFilter.value)return;
      if(price){
        const trend=document.createElement("span");trend.className="price-trend trend-"+change.type;
        trend.textContent=change.type==="up"?"↑ +"+formatPrice(change.delta):change.type==="down"?"↓ −"+formatPrice(Math.abs(change.delta)):change.type==="same"?"— Không đổi":"Mới";
        cell.append(trend);
        cell.classList.add("history-clickable");cell.title="Xem lịch sử giá";
        cell.tabIndex=0;cell.setAttribute("role","button");
        cell.addEventListener("click",()=>showHistory(product.name,variant.storage,color));
        cell.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showHistory(product.name,variant.storage,color)}});
      }
      cell.prepend(colorLine,priceEl);
      colors.appendChild(cell);
    });

    if(colors.children.length){
      row.append(storageWrap,colors);
      body.appendChild(row);
    }
  });

  card.append(header,body);
  return card;
}

function renderProducts(products){
  grid.innerHTML="";
  let up=0,down=0,same=0,unknown=0;
  products.forEach(p=>p.variants.forEach(v=>v.rows.forEach(([c,price])=>{
    if(!price)return;
    const type=priceChange(p.name,v.storage,c,price).type;
    if(type==="up")up++;else if(type==="down")down++;else if(type==="same")same++;else unknown++;
  })));
  changeSummary.textContent=`↑ ${up} tăng · ↓ ${down} giảm · ${same} không đổi · ${unknown} chưa có mốc`;
  if(!products.length){
    grid.innerHTML='<div class="error-box">Không tìm thấy sản phẩm phù hợp.</div>';
    return;
  }

  if(isMobile()){
    const col=document.createElement("div");
    col.className="column";
    products.forEach(p=>col.appendChild(renderProductCard(p)));
    grid.appendChild(col);
    return;
  }

  const split=Math.ceil(products.length/2);
  [products.slice(0,split),products.slice(split)].forEach(group=>{
    const col=document.createElement("div");
    col.className="column";
    group.forEach(p=>col.appendChild(renderProductCard(p)));
    grid.appendChild(col);
  });
}

const dailyPanel=document.getElementById("dailyPanel");
const dailyDown=document.getElementById("dailyDown");
const dailyUp=document.getElementById("dailyUp");
const dailyDate=document.getElementById("dailyDate");
const dailyDetail=document.getElementById("dailyDetail");
let dailyTab="down";
function renderDailyDashboard(){
  if(!dailyPanel)return;
  const today=new Date();today.setHours(0,0,0,0);
  const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
  const base=[...PRICE_HISTORY].reverse().find(x=>localDay(x.time)===localDay(yesterday.getTime()));
  dailyDate.textContent=`${yesterday.toLocaleDateString("vi-VN")} → ${new Date().toLocaleDateString("vi-VN")}`;
  const changed=[];
  if(base){ALL_PRODUCTS.forEach(p=>p.variants.forEach(v=>v.rows.forEach(([color,price])=>{
    const key=itemKey(p.name,v.storage,color);
    if(!price||!Object.prototype.hasOwnProperty.call(base.prices,key))return;
    const now=parsePrice(price),before=base.prices[key],delta=now-before;
    if(delta!==0)changed.push({model:p.name,storage:v.storage,color,now,before,delta});
  })));}
  const down=changed.filter(x=>x.delta<0).sort((a,b)=>a.delta-b.delta);
  const up=changed.filter(x=>x.delta>0).sort((a,b)=>b.delta-a.delta);
  dailyDown.textContent=`↓ ${down.length} giảm giá`;
  dailyUp.textContent=`↑ ${up.length} tăng giá`;
  dailyPanel.querySelectorAll("[data-daily-tab]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.dailyTab===dailyTab);
    btn.setAttribute("aria-pressed",String(btn.dataset.dailyTab===dailyTab));
  });
  dailyDetail.replaceChildren();
  if(!base){const msg=document.createElement("p");msg.className="daily-empty";msg.textContent="Chưa có dữ liệu giá ngày hôm qua trên trình duyệt này. Hệ thống sẽ tự ghi nhận giá từ hôm nay để so sánh vào ngày mai.";dailyDetail.append(msg);return;}
  const rows=dailyTab==="down"?down:up;
  if(!rows.length){const msg=document.createElement("p");msg.className="daily-empty";msg.textContent=dailyTab==="down"?"Không có phiên bản nào giảm giá so với hôm qua.":"Không có phiên bản nào tăng giá so với hôm qua.";dailyDetail.append(msg);return;}
  const table=document.createElement("table");table.className="daily-table";
  const head=document.createElement("thead");const hr=document.createElement("tr");
  ["Máy / dung lượng / màu","Hôm qua","Hôm nay","Chênh lệch"].forEach(t=>{const th=document.createElement("th");th.textContent=t;hr.append(th)});head.append(hr);table.append(head);
  const body=document.createElement("tbody");
  rows.forEach(x=>{const tr=document.createElement("tr");
    const values=[`${x.model} · ${x.storage} · ${x.color}`,formatPrice(x.before),formatPrice(x.now),`${x.delta<0?"↓ −":"↑ +"}${formatPrice(Math.abs(x.delta))}`];
    values.forEach((v,i)=>{const td=document.createElement("td");td.textContent=v;if(i===3)td.className=x.delta<0?"daily-decrease":"daily-increase";tr.append(td)});body.append(tr)});
  table.append(body);dailyDetail.append(table);
}
dailyPanel.querySelectorAll("[data-daily-tab]").forEach(btn=>btn.addEventListener("click",()=>{dailyTab=btn.dataset.dailyTab;renderDailyDashboard()}));

function applyFilters(){
  const q=searchInput.value.trim().toLowerCase();
  renderProducts(ALL_PRODUCTS.filter(p=>!q||p.name.toLowerCase().includes(q)));
}

function updateSuggestions(){
  const q=searchInput.value.trim().toLowerCase();
  if(!q){
    suggestions.classList.remove("show");
    suggestions.innerHTML="";
    return;
  }

  const matches=ALL_PRODUCTS.filter(p=>p.name.toLowerCase().includes(q)).slice(0,10);
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
          if(isMobile())card.classList.add("mobile-open");
          card.scrollIntoView({behavior:"smooth",block:"start"});
        }
      });
    });
    suggestions.appendChild(btn);
  });

  suggestions.classList.toggle("show",matches.length>0);
}

function saveCache(products){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify({
      savedAt:Date.now(),
      products
    }));
  }catch(_){}
}

function loadCache(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw)return false;
    const cached=JSON.parse(raw);
    if(!cached?.products?.length)return false;
    if(Date.now()-cached.savedAt>CACHE_MAX_AGE)return false;

    ALL_PRODUCTS=cached.products;
    applyFilters();
    renderDailyDashboard();

    const saved=new Date(cached.savedAt);
    priceDate.textContent=`PS / BÁO GIÁ NGÀY: ${saved.toLocaleDateString("vi-VN")}`;
    syncStatus.textContent="Đang cập nhật giá mới...";
    return true;
  }catch(_){
    return false;
  }
}

async function refreshData(){
  if(REFRESHING)return;
  REFRESHING=true;

  try{
    // Tải markup và dữ liệu nguồn SONG SONG để giảm thời gian chờ.
    const sourceUrl=
      `https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq`+
      `?tqx=out:csv&tq&gid=${SOURCE_GID}&range=A:D&headers=1&_=${Date.now()}`;

    const sourceText=await fetchText(sourceUrl);

    const data=normalizeData(parseCSV(sourceText));
    if(!data.length)throw new Error("Không lấy được bảng giá.");

    ALL_PRODUCTS=buildProducts(data);
    recordHistory(ALL_PRODUCTS);
    applyFilters();
    renderDailyDashboard();
    saveCache(ALL_PRODUCTS);

    const now=new Date();
    priceDate.textContent=`PS / BÁO GIÁ NGÀY: ${now.toLocaleDateString("vi-VN")}`;
    syncStatus.textContent=`Cập nhật lúc ${now.toLocaleTimeString("vi-VN")}`;

  }catch(error){
    console.error(error);

    // Nếu đã có cache/giá cũ thì giữ nguyên, không hiện màn hình trống.
    if(ALL_PRODUCTS.length){
      syncStatus.textContent="Đang dùng dữ liệu gần nhất";
    }else{
      syncStatus.textContent="Không thể cập nhật dữ liệu";
      grid.innerHTML='<div class="error-box">Đang thử kết nối lại...</div>';
    }
  }finally{
    REFRESHING=false;
  }
}

// Hiển thị cache NGAY, rồi cập nhật nền.
const hasCache=loadCache();
if(!hasCache){
  grid.innerHTML='<div class="loading">Đang tải bảng giá...</div>';
}
refreshData();

searchInput.addEventListener("input",()=>{
  applyFilters();
  updateSuggestions();
});
searchInput.addEventListener("focus",updateSuggestions);
document.addEventListener("click",e=>{
  if(!e.target.closest(".search-wrap"))suggestions.classList.remove("show");
});
onlyPriced.addEventListener("change",applyFilters);

floatingSearch.addEventListener("click",()=>{
  toolbar.scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>{searchInput.focus();searchInput.select();},300);
});

const savedTheme=localStorage.getItem("price-theme");
if(savedTheme==="dark"){
  document.body.classList.add("dark");
  themeToggle.checked=true;
}
themeToggle.addEventListener("change",()=>{
  document.body.classList.toggle("dark",themeToggle.checked);
  localStorage.setItem("price-theme",themeToggle.checked?"dark":"light");
});

window.addEventListener("resize",applyFilters);
setInterval(refreshData,AUTO_REFRESH_MS);
