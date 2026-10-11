(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hasPlan=(code)=>{
    try{
      const st=typeof readStore==='function'?readStore():{};
      const plans=Array.isArray(st._studyPlans)?st._studyPlans:[];
      return plans.some(p=>Array.isArray(p.packageCodes)&&p.packageCodes.includes(code));
    }catch(e){return false}
  };
  function tile(code,idx,material){
    const d=DB[code]||{},title=d.title||('Paket '+code),st=packageStats(code),pct=st.pct||0;
    const isHsk=material?.kind==='hsk';
    const palette=['blue','purple','orange','pink','green'][idx%5];
    const status=isHsk?(pct>=100?'Selesai':pct>0?'Sedang berjalan':'Belum dimulai'):'';
    const added=hasPlan(code);
    return `<article class="tile packageTile packageTile-${palette} packageTileShell" data-package-code="${esc(code)}">
      <button class="packageTileMain" type="button" onclick="openPackageFromTile('${esc(code)}')" aria-label="Buka ${esc(title)}">
        <div class="pkgTop"><div class="tileIcon" aria-hidden="true">${typeof svg==='function'?svg('box'):''}</div>${isHsk?`<span class="statusPill">${esc(status)}</span>`:''}</div>
        <div class="pkgTitleRow"><div><b>${esc(title)}</b><small>${esc(packageDesc(code))}</small></div></div>
        ${isHsk&&st.total?progressHTML({answered:st.answered,total:st.total,pct:st.pct},'Progres paket'):''}
        <div class="pkgFooter"><span>${esc(material?.label||'Materi')}</span>${isHsk?`<span>${pct}%</span>`:''}</div>
      </button>
      <div class="packageTileActions" aria-label="Aksi paket">
        <button class="packageStartBtn" type="button" onclick="openPackageFromTile('${esc(code)}')">▶ Mulai</button>
        <button class="packagePlanBtn ${added?'isAdded':''}" type="button" onclick="openStudyPlanPicker('${esc(code)}')">${added?'✓ Di Rencana':'＋ Rencana'}</button>
      </div>
    </article>`;
  }
  window.__restoreStudyPlanPackageTile=tile;
  /* Package cards use the V16 renderer directly; no legacy card rebuild. */
  /* Keep the plan detail action buttons visible on mobile. */
  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('.packagePlanBtn');
    if(!btn)return;
    e.stopPropagation();
  },true);
  /* When a plan changes, refresh visible package action state if we are on the package list. */
  const oldRenderStudyPlans=window.renderStudyPlans;
  window.renderStudyPlans=function(){
    if(typeof oldRenderStudyPlans==='function')oldRenderStudyPlans.apply(this,arguments);
    if(route?.screen==='levels'||route?.screen==='packages')setTimeout(()=>window.renderPackagesScreen?.(),0);
  };
})();
