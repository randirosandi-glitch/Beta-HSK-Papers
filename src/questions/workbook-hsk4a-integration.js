(function(){

const wbCodes=()=>Object.keys(DB).filter(c=>c.startsWith('WB4A'));
const hsk4Codes=()=>Object.keys(DB).filter(c=>!c.startsWith('WB4A'));
const levelCodes=()=>selectedHSKLevel==='wb4a'?wbCodes():hsk4Codes();
function ensureWorkbookLevelCard(){const grid=document.querySelector('#levelsScreen .levelGrid');if(!grid||grid.querySelector('.levelCardWorkbook'))return;const b=document.createElement('button');b.className='levelCard levelCardWorkbook';b.type='button';b.onclick=()=>openLevelPackages('wb4a');b.innerHTML='<div class="levelCardIcon">WB</div><div class="levelCardBody"><span class="levelEyebrow">WORKBOOK</span><strong>Workbook HSK4a</strong><p>9 lesson · 450 soal</p></div><span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span>';grid.appendChild(b)}
window.renderPackage=function(){const code=route.packageCode,d=DB[code]||{};$('pkgCrumb').textContent=code;$('pkgTitle').textContent=d.title||('Paket '+code);const palettes={listening:{accent:'#ff6548',soft:'#fff0eb'},reading:{accent:'#7890d8',soft:'#eef2ff'},writing:{accent:'#e5ad3d',soft:'#fff5df'}};$('parts').innerHTML=Object.entries(META).map(([t,m])=>{const arr=d[t]||[],total=arr.reduce((a,x)=>a+x.questions.length,0),ps=arr.reduce((a,x,i)=>{const st=sectionStats(code,t,i);return {answered:a.answered+st.answered,total:a.total+st.total}},{answered:0,total:0});ps.pct=ps.total?Math.round(ps.answered/ps.total*100):0;const pal=palettes[t]||palettes.listening;return total?`<button class="partCard flatPartCard" style="--part-accent:${pal.accent};--part-soft:${pal.soft}" type="button" onclick="openSections('${esc(code)}','${t}')"><span class="partHanzi" aria-hidden="true">${esc(m.zh)}</span><span class="partMain"><strong>${esc(m.label)}</strong><span class="partMeta">${total} soal tersedia</span>${progressHTML(ps,'Progres bagian')}</span><span class="partArrow" aria-hidden="true"><span class="material-symbols-rounded ico">arrow_forward</span></span></button>`:`<div class="partCard flatPartCard partDisabled" style="--part-accent:${pal.accent};--part-soft:${pal.soft}" aria-disabled="true"><span class="partHanzi" aria-hidden="true">${esc(m.zh)}</span><span class="partMain"><strong>${esc(m.label)}</strong><span class="partMeta">Belum tersedia dari sumber paket</span></span></div>`}).join('')+`<div style="grid-column:1/-1">${renderPackageProgress(code)}</div>`};
// Workbook-specific grading: first Listening section is true/false; Reading section 3 is ordering.
const oldCorrectIndex=window.correctIndex;
window.correctIndex=function(q,type){
 const code=String(route?.packageCode||'');
 const id=Number(q[0]),key=String(q[3]??'').trim();
 if(type==='listening'&&(code.startsWith('WB4A')||code.startsWith('WB4B'))) return id<=5?(key==='√'?0:1):(/^[A-F]$/.test(key)?key.charCodeAt(0)-65:(q[2]||[]).findIndex(o=>norm(o)===norm(key)));
 if(type==='reading'&&(code.startsWith('WB4A')||code.startsWith('WB4B'))&&Number(route?.sectionIndex)===2) return permutations().indexOf(key);
 return oldCorrectIndex(q,type);
};

// Workbook package integration ends here; Home dashboard uses the global activity model above.
})();
