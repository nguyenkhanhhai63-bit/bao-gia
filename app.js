
const grid = document.getElementById("priceGrid");
const priceDate = document.getElementById("priceDate");
const syncStatus = document.getElementById("syncStatus");
const themeToggle = document.getElementById("themeToggle");

function parseCSV(text){
  const rows=[]; let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c=='"'&&q&&n=='"'){cell+='"';i++}
    else if(c=='"'){q=!q}
    else if(c==','&&!q){row.push(cell);cell=""}
    else if((c=='\n'||c=='\r')&&!q){
      if(c=='\r'&&n=='\n')i++;
      row.push(cell); if(row.some(x=>String(x).trim()!==""))rows.push(row);
      row=[];cell="";
    }else cell+=c;
  }
  if(cell.length||row.length){row.push(cell);if(row.some(x=>String(x).trim()!==""))rows.push(row)}
  return rows;
}

function fmtPrice(n){
  return Math.round(n).toLocaleString("vi-VN").replaceAll(",", ".");
}

function parsePrice(s){
  // nguồn hiển thị kiểu 23.823 -> 23823 (nghìn đồng)
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

function buildProducts(data){
  const modelOrder=[];
  const map=new Map();

  for(const x of data){
    if(!map.has(x.model)){map.set(x.model,new Map());modelOrder.push(x.model)}
    const mm=map.get(x.model);
    if(!mm.has(x.mem)) mm.set(x.mem,[]);
    mm.get(x.mem).push([x.color,x.price]);
  }

  return modelOrder.map(name=>({
    name,
    variants:[...map.get(name).entries()]
      .sort((a,b)=>storageSort(a[0],b[0]))
      .map(([storage,rows])=>({storage,rows:rows.sort((a,b)=>a[0].localeCompare(b[0],"vi"))}))
  }));
}

function chunk(a,n=3){const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o}

function renderProduct(p){
  const t=document.createElement("table");t.className="product-table";
  const vs=p.variants.map(v=>({...v,lines:chunk(v.rows,3)}));
  const total=vs.reduce((s,v)=>s+v.lines.length,0);let printed=false;

  for(const v of vs){
    v.lines.forEach((line,k)=>{
      const tr=document.createElement("tr");
      if(!printed){
        const th=document.createElement("th");th.className="product-name";th.rowSpan=total;th.textContent=p.name;tr.appendChild(th);printed=true;
      }
      if(k===0){
        const td=document.createElement("td");td.className="variant";td.rowSpan=v.lines.length;td.textContent=v.storage;tr.appendChild(td);
      }
      for(let i=0;i<3;i++){
        const td=document.createElement("td");td.className="color-cell";
        const item=line[i];
        if(item){
          td.append(document.createTextNode(item[0]+" "));
          const s=document.createElement("span");s.className="price";s.textContent=item[1];td.appendChild(s);
        }else td.innerHTML='<span class="empty">.</span>';
        tr.appendChild(td);
      }
      t.appendChild(tr);
    });
  }
  return t;
}

function render(products){
  grid.innerHTML="";
  const split=Math.ceil(products.length/1.8);
  const groups=[products.slice(0,split),products.slice(split)];
  for(const group of groups){
    const c=document.createElement("div");c.className="column";
    group.forEach(p=>c.appendChild(renderProduct(p)));
    grid.appendChild(c);
  }
}

async function load(){
  try{
    const url=`https://docs.google.com/spreadsheets/d/${SOURCE_SHEET_ID}/gviz/tq?tqx=out:csv&tq&gid=${SOURCE_GID}&range=A:D&headers=1&_=${Date.now()}`;
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const data=normalizeData(parseCSV(await res.text()));
    if(!data.length)throw new Error("Không lấy được giá từ nguồn.");
    render(buildProducts(data));

    const now=new Date();
    priceDate.textContent=`PS / Báo giá ngày: ${now.toLocaleDateString("vi-VN")}`;
    syncStatus.textContent=`Đã lấy giá nguồn và cộng lãi lúc ${now.toLocaleTimeString("vi-VN")} • Mặc định +${DEFAULT_MARKUP}K`;
  }catch(e){
    console.error(e);
    syncStatus.textContent="Lỗi đồng bộ: "+e.message;
    grid.innerHTML=`<div class="error-box">Không tải được giá nguồn.<br>${e.message}</div>`;
  }
}

const saved=localStorage.getItem("price-theme");
if(saved==="dark"){document.body.classList.add("dark");themeToggle.checked=true}
themeToggle.addEventListener("change",()=>{
  document.body.classList.toggle("dark",themeToggle.checked);
  localStorage.setItem("price-theme",themeToggle.checked?"dark":"light");
});

load();
setInterval(load,AUTO_REFRESH_MS);
