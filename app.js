const DATA_URL='https://raw.githubusercontent.com/Rplus/pokemongo-shiny/main/src/assets/data/pms.json';
const NAME_URL='https://raw.githubusercontent.com/Rplus/pokemongo-shiny/main/src/assets/data/name.csv';
const $=id=>document.getElementById(id);let rows=[],nameMap={},owned=new Set(JSON.parse(localStorage.getItem('shiny-scout-owned')||'[]')),view='missing';
const legendary=new Set([144,145,146,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,638,639,640,641,642,643,644,645,646,647,648,649,716,717,718,719,720,721,772,773,785,786,787,788,789,790,791,792,800,801,802,888,889,890,891,892,894,895,896,897,898,905,1001,1002,1003,1004,1007,1008,1014,1015,1016,1017,1024]);
function gen(d){return d<=151?1:d<=251?2:d<=386?3:d<=493?4:d<=649?5:d<=721?6:d<=809?7:d<=905?8:9}
function label(r){let n=nameMap[r.dex]||r.family||('Pokémon #'+r.dex);return n}
function isVariant(r){return !!(r.isotope||r.type||r.name_suffix||r.fn||r.aa_fn||(/_[a-z0-9]/i.test(r.family||'')));}
function isMega(r){return /mega|_51|_52/i.test((r.name_suffix||'')+' '+(r.type||'')+' '+(r.family||''));}
function isShadow(r){return /shadow/i.test((r.family||'')+' '+(r.name_suffix||'')+' '+(r.tag||''));}
function isLegend(r){return legendary.has(+r.dex)}
function isReleased(r){return r.shiny_released===true || !!r.released_date || !!r.debut}
function key(r){return [r.dex,r.family||'',r.isotope||'',r.type||'',r.fn||'',r.aa_fn||'',r.name_suffix||''].join('|')}
const ASSET_BASE='https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets/';
function imageCandidates(r){
 const dex=String(r.dex),id='pm'+dex,candidates=[];
 const add=name=>{if(name&&!candidates.includes(name))candidates.push(name)};
 // Rplus stores the original game-master asset filename in fn/aa_fn.
 for(const field of [r.fn,r.aa_fn]){
  if(typeof field==='string'&&field.trim()){
   const value=field.trim();
   const match=value.match(/pm\d+([._][A-Za-z0-9_.-]+)$/i);
   if(match){
    let suffix=match[1];
    if(suffix.startsWith('_')&&/_pgo_/i.test(suffix))suffix='.f'+suffix.split(/_pgo_/i).pop().replace(/[^a-z0-9]+/gi,'_').toUpperCase();
    add(id+suffix+'.s.icon.png');
   }
  }
 }
 // Explicit form assets: Mega, regional and other named forms.
 if(r.type==='_51')add(id+'.fMEGA_X.s.icon.png');
 if(r.type==='_52')add(id+'.fMEGA_Y.s.icon.png');
 if(r.type&&r.type!=='_51'&&r.type!=='_52')add(id+'.f'+r.type.replace(/^_+/,'').toUpperCase()+'.s.icon.png');
 const family=String(r.family||'');
 const suffix=family.match(/_([a-z][a-z0-9_]*)$/i);
 if(suffix){
  const code=suffix[1].toUpperCase();
  const known={F19:'FALL_2019',F20:'FALL_2020',G19:'GO_FEST_2019'};
  if(known[code])add(id+'.f'+known[code]+'.s.icon.png');
  if(/^(ALOLA|GALARIAN|HISUIAN|PALDEAN|PALDEA|MEGA|PRIMAL|ORIGIN|THERIAN|SKY|ALTERED|INCARNATE|WHITE|BLACK|ASH|DUSK|DAWN|MIDDAY|MIDNIGHT|BLOODMOON|PALDEA_AQUA|PALDEA_BLAZE|PALDEA_COMBAT)$/.test(code))add(id+'.f'+code+'.s.icon.png');
 }
 // Base shiny icon is last resort only, never the first choice for a form.
 add(id+'.s.icon.png');
 return candidates.map(file=>ASSET_BASE+file);
}
function imageUrl(r){return imageCandidates(r)[0]}
function variantId(r){
 const parts=[r.isotope,r.type,r.name_suffix,r.fn,r.aa_fn].filter(v=>v&&String(v).trim());
 return parts.length?parts.map(v=>String(v).replace(/[^a-zA-Z0-9_-]+/g,'_')).join('__'):'default';
}
function parseCsvLine(line){
 const out=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'&&quoted){value+='"';i++}else if(ch==='"'){quoted=!quoted}else if(ch===','&&!quoted){out.push(value);value=''}else value+=ch}
 out.push(value);return out;
}
function persist(){localStorage.setItem('shiny-scout-owned',JSON.stringify([...owned]));render()}
function matches(r){if(!isReleased(r))return false;const q=$('search').value.trim().toLowerCase();const text=(label(r)+' '+(r.family||'')+' '+(r.name_suffix||'')+' '+r.dex).toLowerCase();if(q&&!text.includes(q))return false;const g=$('generation').value;if(g&&gen(+r.dex)!==+g)return false;const k=$('kind').value;if(k==='legendary'&&!isLegend(r))return false;if(k==='shadow'&&!isShadow(r))return false;if(k==='mega'&&!isMega(r))return false;if(k==='variant'&&!isVariant(r))return false;if($('wild').checked&&r.found_wild===false)return false;if($('variants').value==='exclude'&&isVariant(r))return false;if($('shadows').value==='exclude'&&isShadow(r))return false;if($('megas').value==='exclude'&&isMega(r))return false;const collected=owned.has(key(r));if(view==='missing'&&collected)return false;if(view==='collected'&&!collected)return false;return true}
function render(){let list=rows.filter(matches);if($('sort').value==='name')list.sort((a,b)=>label(a).localeCompare(label(b)));else if($('sort').value==='recent')list.sort((a,b)=>(Date.parse(b.released_date||b.debut||'')||0)-(Date.parse(a.released_date||a.debut||'')||0));else list.sort((a,b)=>a.dex-b.dex);$('total').textContent=list.length.toLocaleString();$('caught').textContent=owned.size.toLocaleString();const all=rows.filter(isReleased);const pct=all.length?Math.round(owned.size/all.length*100):0;$('percent').textContent=pct+'%';$('bar').style.width=Math.min(100,pct)+'%';$('resultCount').textContent=list.length.toLocaleString()+' Pokémon';$('resultSub').textContent=view==='missing'?'Tap a Pokémon to mark it collected.':view==='collected'?'Tap a collected Pokémon to move it back to missing.':'Tap any Pokémon to update its collection status.';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const grid=$('grid');grid.innerHTML='';if(!list.length){grid.innerHTML='<div class="empty">No Pokémon match these filters.<br>Try changing your search or filters.</div>';return}const frag=document.createDocumentFragment();for(const r of list){const k=key(r),yes=owned.has(k),card=document.createElement('button');card.className='card'+(yes?' owned':'');card.setAttribute('aria-label',(yes?'Unmark ':'Mark ')+label(r));const sprite=document.createElement('div');sprite.className='sprite';const img=document.createElement('img');img.loading='lazy';img.alt='';const candidates=imageCandidates(r);let imageIndex=0;const loadNextImage=()=>{if(imageIndex<candidates.length){img.src='https://images.weserv.nl/?url='+encodeURIComponent(candidates[imageIndex++])+'&w=112&h=112&fit=contain&output=webp&q=76';}else{img.onerror=null;img.src='https://images.weserv.nl/?url='+encodeURIComponent('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+r.dex+'.png')+'&w=112&h=112&fit=contain&output=webp&q=76';}};img.onerror=loadNextImage;loadNextImage();sprite.append(img);const dex=document.createElement('div');dex.className='dex';dex.textContent='#'+String(r.dex).padStart(4,'0')+' · Gen '+gen(+r.dex);const nm=document.createElement('div');nm.className='name';nm.textContent=label(r);const form=document.createElement('div');form.className='form';form.textContent=(r.name_suffix||'').replace(/[()]/g,'')+(isVariant(r)?' Variant':'');const tag=document.createElement('div');tag.className='tag';tag.textContent=yes?'✓ Collected':(isLegend(r)?'Legendary / Mythical':isMega(r)?'Mega form':isShadow(r)?'Shadow':r.released_date?'Shiny released':'Shiny variant');const check=document.createElement('span');check.className='check';check.textContent=yes?'✓':'+';card.append(check,sprite,dex,nm,form,tag);card.addEventListener('click',()=>{owned.has(k)?owned.delete(k):owned.add(k);persist()});frag.append(card)}grid.append(frag)}
async function fetchLatest(url){const freshUrl=url+(url.includes('?')?'&':'?')+'_='+Date.now();return fetch(freshUrl,{cache:'no-store'});}\nasync function init(){try{$('status').textContent='Fetching the latest shiny data from Rplus…';const [dataRes,nameRes]=await Promise.all([fetchLatest(DATA_URL),fetchLatest(NAME_URL).catch(()=>null)]);if(!dataRes||!dataRes.ok)throw new Error('Dataset request failed ('+(dataRes?dataRes.status:'network error')+')');const raw=await dataRes.json();if(!Array.isArray(raw))throw new Error('The shiny dataset returned an unexpected format');if(nameRes&&nameRes.ok){const csv=await nameRes.text();for(const line of csv.split(/\r?\n/).slice(1)){const c=parseCsvLine(line);if(c.length>7&&/^\d+$/.test(c[0]))nameMap[+c[0]]=c[7].trim()}}rows=raw.filter(r=>r&&Number.isFinite(+r.dex)&&+r.dex>0&&isReleased(r));
// Explicit Halloween 2026 additions announced after the upstream snapshot.
rows.push(
 {dex:25,family:'Pikachu (Halloween 2026 — Hat & Capelet)',shiny_released:true,isotope:'_2026_HALLOWEEN',released_date:'2026/10/27',event:'Halloween 2026',found_wild:true},
 {dex:41,family:'Zubat (Halloween 2026 — Top Hat)',shiny_released:true,isotope:'_2026_HALLOWEEN',released_date:'2026/10/27',event:'Halloween 2026',found_wild:true},
 {dex:854,family:'Sinistea (Halloween 2026 — Bow)',shiny_released:true,isotope:'_2026_HALLOWEEN',released_date:'2026/10/27',event:'Halloween 2026',found_wild:false},
 {dex:971,family:'Greavard (Shiny debut — Halloween 2026)',shiny_released:true,isotope:'_2026_SHINY_DEBUT',released_date:'2026/11/01',event:'Halloween 2026',found_wild:true},
 {dex:972,family:'Houndstone (Shiny evolution — Halloween 2026)',shiny_released:true,isotope:'_2026_SHINY_DEBUT',released_date:'2026/11/01',event:'Halloween 2026',found_wild:false}
);
const seen=new Set();rows=rows.filter(r=>{const k=key(r);if(seen.has(k))return false;seen.add(k);return true});const genSel=$('generation');for(let i=1;i<=9;i++){const o=document.createElement('option');o.value=i;o.textContent=["Kanto","Johto","Hoenn","Sinnoh","Unova","Kalos","Alola","Galar","Paldea"][i-1];genSel.append(o)}$('status').textContent='Loaded '+rows.length.toLocaleString()+' released shiny entries from Rplus. Filters are ready.';render()}catch(e){$('status').textContent='Could not load shiny data. Check your internet connection or try again later. ('+e.message+')';$('grid').innerHTML='<div class="empty">Data could not be loaded. The source dataset is hosted on GitHub.</div>'}}
['search','generation','kind','wild','variants','shadows','megas','sort'].forEach(id=>$(id).addEventListener('input',render));document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render()}));function exportList(){
 const pokemon={};
 for(const r of rows){
  const dex=String(r.dex);
  if(!pokemon[dex])pokemon[dex]={name:label(r),variant:{}};
  pokemon[dex].variant[variantId(r)]=owned.has(key(r));
 }
 const payload={format:'shiny-scout-list',version:1,exportedAt:new Date().toISOString(),pokemon};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='shiny-scout-list.json';a.click();URL.revokeObjectURL(url);
}
async function importList(file){
 const data=JSON.parse(await file.text());
 if(data.format==='shiny-scout-list'&&data.pokemon&&typeof data.pokemon==='object'){
  // Apply only the variants explicitly present in the file. True adds to Collected;
  // false removes from Collected. Unlisted Pokémon/variants keep their current state.
  let changed=0;
  for(const [dex,entry] of Object.entries(data.pokemon)){
   if(!entry||!entry.variant||typeof entry.variant!=='object')continue;
   for(const r of rows){
    if(String(r.dex)!==String(dex))continue;
    const id=variantId(r);
    if(!Object.prototype.hasOwnProperty.call(entry.variant,id))continue;
    const k=key(r),value=entry.variant[id];
    if(value===true){if(!owned.has(k)){owned.add(k);changed++;}}
    else if(value===false){if(owned.delete(k))changed++;}
   }
  }
  persist();$('status').textContent='Import applied: '+changed+' collection status changes. Unlisted entries were left unchanged.';
 }else if(Array.isArray(data.owned)){
  owned=new Set(data.owned.filter(k=>typeof k==='string'));persist();
  $('status').textContent='Full collected list imported successfully.';
 }else throw new Error('Unsupported JSON format');
}

async function exportCurrentViewImage(){
 const button=$('exportImage'),grid=$('grid');
 if(!window.html2canvas){$('status').textContent='Image exporter is still loading. Try again in a moment.';return}
 const oldText=button.textContent;button.disabled=true;button.textContent='Preparing image…';
 try{
  // Force visible sprites to finish loading before rasterizing the current filtered grid.
  const images=[...grid.querySelectorAll('img')];
  await Promise.all(images.map(img=>{img.loading='eager';if(img.complete&&img.naturalWidth)return Promise.resolve();return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,10000)})}));
  const canvas=await html2canvas(grid,{backgroundColor:'#101218',scale:1.25,useCORS:true,allowTaint:false,logging:false});
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.78));
  if(!blob)throw new Error('Could not encode the image');
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='shiny-scout-current-view.jpg';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  $('status').textContent='Current view exported as a compact JPEG ('+(blob.size/1024).toFixed(0)+' KB).';
 }catch(err){$('status').textContent='Image export failed: '+err.message}
 finally{button.disabled=false;button.textContent=oldText}
}
$('exportImage').addEventListener('click',exportCurrentViewImage);

$('export').onclick=exportList;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{try{const file=e.target.files[0];if(file)await importList(file)}catch(err){alert('Could not import this list: '+err.message)}finally{e.target.value=''}};$('clear').onclick=()=>{if(confirm('Clear all collected marks saved in this browser?')){owned.clear();persist()}};init();
