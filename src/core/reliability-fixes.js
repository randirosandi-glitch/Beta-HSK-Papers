/* Source module: master reliability fixes.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';

  /* ============================================================
     MASTER RELIABILITY LAYER
     One source of truth for material navigation, package lists,
     study-plan picker, navigation/back behavior and scores.
     It intentionally sits last so older patches cannot overwrite
     these critical interactions.
     ============================================================ */

  const MASTER = window.__masterReliabilityFix = window.__masterReliabilityFix || {};
  const has = id => document.getElementById(id);

  function escHtml(v){
    if(typeof esc === 'function') return esc(String(v ?? ''));
    return String(v ?? '').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function regularLevel(code){
    const m=String(code||'').trim().match(/^H(\d+)\d{4}[A-Za-z]?$/i);
    return m ? Number(m[1]) : null;
  }

  function workbookFamily(code){
    const m=String(code||'').trim().match(/^WB(\d+)([A-Za-z]+)\d+$/i);
    if(!m) return null;
    return {
      key:'WB'+m[1]+m[2].toUpperCase(),
      level:Number(m[1]),
      suffix:m[2].toLowerCase(),
      label:'Workbook HSK'+m[1]+m[2].toLowerCase()
    };
  }

  function materialCatalog(){
    const dbCodes=(typeof DB!=='undefined' && DB) ? Object.keys(DB) : [];
    const hsk=new Map();
    const wb=new Map();

    dbCodes.forEach(code=>{
      const level=regularLevel(code);
      if(level!==null){
        if(!hsk.has(level)) hsk.set(level,[]);
        hsk.get(level).push(code);
        return;
      }
      const family=workbookFamily(code);
      if(family){
        if(!wb.has(family.key)) wb.set(family.key,{...family,codes:[]});
        wb.get(family.key).codes.push(code);
      }
    });

    hsk.forEach(v=>v.sort());
    wb.forEach(v=>v.codes.sort((a,b)=>{
      const na=Number((a.match(/\d+$/)||['0'])[0]);
      const nb=Number((b.match(/\d+$/)||['0'])[0]);
      return na-nb || a.localeCompare(b);
    }));

    return {
      hsk:[...hsk.entries()].sort((a,b)=>a[0]-b[0]).map(([level,codes])=>({
        kind:'hsk',key:'hsk:'+level,level,label:'HSK '+level,codes
      })),
      workbook:[...wb.values()].sort((a,b)=>
        a.level-b.level || a.suffix.localeCompare(b.suffix)
      ).map(x=>({kind:'workbook',key:'wb:'+x.key,label:x.label,codes:x.codes}))
    };
  }

  function allMaterials(){
    const c=materialCatalog();
    return [...c.hsk,...c.workbook];
  }

  function materialForKey(key){
    return allMaterials().find(m=>m.key===key) || null;
  }

  /* ---------- Package / level navigation ---------- */

  /* ---------- Scores: only available materials ---------- */

  function renderScoresMaster(){
    const el=has('scoresGrid');
    if(!el) return;
    const all=allMaterials();
    if(!all.length){
      el.className='levelGrid scoreLevelGrid';
      el.innerHTML='<div class="notice">Belum ada materi yang bisa dinilai.</div>';
      return;
    }
    el.className='levelGrid scoreLevelGrid';
    el.innerHTML=all.map(m=>{
      const isHsk=m.kind==='hsk';
      return `<button class="levelCard ${isHsk?('levelCard'+m.level):'levelCardWorkbook'} scoreLevelCard"
        type="button" onclick="openScoreLevel('${escHtml(m.key)}')">
        <div class="levelCardIcon">${isHsk?m.level:'WB'}</div>
        <div class="levelCardBody">
          <span class="levelEyebrow">${isHsk?'HSK LEVEL':'WORKBOOK'}</span>
          <strong>${escHtml(m.label)}</strong>
          <p>${m.codes.length} ${isHsk?'paket':'lesson'} tersedia</p>
        </div>
        <span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span>
      </button>`;
    }).join('');
  }

  window.renderScores=renderScoresMaster;

  window.openScoreLevel=function(key){
    let material=materialForKey(String(key??''));
    if(!material){
      const n=Number(key);
      material=materialForKey('hsk:'+n);
    }
    if(!material){renderScoresMaster();return;}

    const el=has('scoresGrid');
    if(!el)return;
    el.className='grid scorePackagesGrid';
    const cards=material.codes.map((code,idx)=>{
      const st=packageStats(code);
      const score=st.gradedTotal?st.scorePct:0;
      const status=st.answered===0?'Belum dikerjakan':st.answered>=st.total?'Selesai':'Sedang berjalan';
      const accent=['blue','purple','orange','pink','green'][idx%5];
      return `<button class="tile packageTile packageTile-${accent}" type="button"
        onclick="showPackageScore('${escHtml(code)}')">
        <div class="pkgTop"><div class="tileIcon" aria-hidden="true">${typeof svg==='function'?svg('chart'):''}</div><span class="statusPill">${status}</span></div>
        <div class="pkgTitleRow"><div><b>${escHtml(DB[code]?.title||('Paket '+code))}</b><small>${st.score}/${st.gradedTotal||0} benar · ${st.answered}/${st.total} terjawab</small></div><span class="pkgArrow">${score}%</span></div>
        ${progressHTML({answered:st.answered,total:st.total,pct:st.pct},'Progres pengerjaan')}
        <div class="pkgFooter"><span>${escHtml(material.label)}</span><span>${score}%</span></div>
      </button>`;
    }).join('');
    el.innerHTML=`<div class="scoreBackRow"><button class="btn" type="button" onclick="renderScores()">← Kembali ke materi</button></div>
      <div class="scoreLevelTitle"><div class="sectionKicker">${escHtml(material.label)}</div><h3>Nilai ${escHtml(material.label)}</h3><p>Pilih paket untuk melihat rincian nilainya.</p></div>
      ${cards||'<div class="notice">Belum ada paket latihan.</div>'}`;
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };

  /* ---------- Navigation ---------- */

  window.renderNavState=function(){
    const packageScreens=new Set(['levels','packages','package','parts','exercise','result']);
    const planScreens=new Set(['studyPlans','studyPlanDetail']);
    document.querySelectorAll('.mainNav .navItem').forEach(b=>{
      const nav=b.dataset.nav;
      b.classList.toggle('active',
        nav==='home' && route.screen==='home' ||
        nav==='packages' && packageScreens.has(route.screen) ||
        nav==='studyPlans' && planScreens.has(route.screen)
      );
    });
  };

  /* ---------- Study plans ---------- */

  function plansStoreMaster(){
    try{
      const s=readStore();
      return Array.isArray(s._studyPlans)?s._studyPlans:[];
    }catch(e){return []}
  }

  function savePlansMaster(plans){
    const s=readStore();
    s._studyPlans=plans;
    writeStore(s);
    scheduleCloudSync();
  }

  function getPlanMaster(id){
    return plansStoreMaster().find(p=>String(p.id)===String(id))||null;
  }

  function planStatsMaster(p){
    const codes=Array.isArray(p?.packageCodes)?p.packageCodes:[];
    let done=0,answered=0,questions=0;
    codes.forEach(code=>{
      const st=packageStats(code);
      answered+=st.answered||0;
      questions+=st.total||0;
      if(st.total && st.answered>=st.total) done++;
    });
    return {total:codes.length,done,answered,questions,pct:codes.length?Math.round(done/codes.length*100):0};
  }

  window.renderStudyPlans=function(){
    const el=has('studyPlansGrid');
    if(!el)return;
    const plans=plansStoreMaster();
    const refreshPackageActions=()=>{
      if(route?.screen==='levels'||route?.screen==='packages')setTimeout(()=>window.renderPackagesScreen?.(),0);
    };
    if(!plans.length){
      el.innerHTML='<div class="studyPlanEmpty"><strong>Belum ada rencana belajar</strong><span>Kumpulkan paket penting untuk membuat playlist latihanmu sendiri.</span><br><button class="btn primary" type="button" onclick="openStudyPlanCreator()">＋ Buat Rencana Baru</button></div>';
      refreshPackageActions();
      return;
    }
    el.innerHTML=plans.map(p=>{
      const st=planStatsMaster(p);
      return `<article class="studyPlanCard" role="button" tabindex="0" data-plan-id="${escHtml(p.id)}" aria-label="Buka rencana ${escHtml(p.name)}" onclick="openStudyPlan('${escHtml(p.id)}')">
        <div class="studyPlanCardTop"><div class="studyPlanIcon" aria-hidden="true"><span class="material-symbols-rounded">checklist</span></div>
          <button class="studyPlanMenu" type="button" onclick="event.stopPropagation();toggleStudyPlanMenu('${escHtml(p.id)}')" aria-label="Menu rencana"><span class="material-symbols-rounded" aria-hidden="true">more_horiz</span></button>
        </div>
        <div class="studyPlanCardMenu" id="planMenu_${escHtml(p.id)}">
          <button type="button" onclick="event.stopPropagation();openStudyPlanEdit('${escHtml(p.id)}')">Edit rencana</button>
          <button type="button" onclick="event.stopPropagation();deleteStudyPlan('${escHtml(p.id)}')">Hapus rencana</button>
        </div>
        <h3>${escHtml(p.name)}</h3>
        <div class="studyPlanDesc">${escHtml(p.description||'Belum ada deskripsi.')}</div>
        <div class="studyPlanMeta"><span>${st.total} paket · ${st.done} selesai</span><span class="studyPlanPct">${st.pct}%</span></div>
        <div class="studyPlanBar"><i style="width:${st.pct}%"></i></div>
      </article>`;
    }).join('');
    const createCard=document.createElement('button');
    createCard.type='button';
    createCard.className='studyPlanCard studyPlanCreateCard';
    createCard.setAttribute('aria-label','Buat Rencana Belajar Baru');
    createCard.innerHTML='<div class="studyPlanIcon">＋</div><h3>Buat Rencana Baru</h3><div class="studyPlanDesc">Buat playlist untuk tujuan belajar yang berbeda.</div>';
    createCard.addEventListener('click',()=>window.openStudyPlanCreator?.());
    el.appendChild(createCard);
    refreshPackageActions();
  };

  window.openStudyPlanCreator=function(){
    const picker=window.__functionalRepairV4?.picker;
    MASTER.pendingCode=picker?.mode==='package'?picker.code:null;
    window.closeStudyPlanPicker();
    const m=has('studyPlanCreatorModal');
    if(!m)return;
    if(has('studyPlanNameInput'))has('studyPlanNameInput').value='';
    if(has('studyPlanDescInput'))has('studyPlanDescInput').value='';
    if(has('studyPlanCreatorError'))has('studyPlanCreatorError').textContent='';
    m.classList.add('show');m.setAttribute('aria-hidden','false');
    setTimeout(()=>has('studyPlanNameInput')?.focus(),50);
  };

  window.closeStudyPlanCreator=function(){
    const m=has('studyPlanCreatorModal');
    if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}
  };

  window.createStudyPlan=function(){
    const name=String(has('studyPlanNameInput')?.value||'').trim();
    const desc=String(has('studyPlanDescInput')?.value||'').trim();
    const err=has('studyPlanCreatorError');
    if(name.length<2){if(err)err.textContent='Nama rencana minimal 2 karakter.';return}
    const plans=plansStoreMaster();
    if(plans.some(p=>String(p.name||'').toLowerCase()===name.toLowerCase())){
      if(err)err.textContent='Nama rencana tersebut sudah digunakan.';
      return;
    }
    const p={id:'sp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name,description:desc,packageCodes:[],createdAt:Date.now(),updatedAt:Date.now()};
    if(MASTER.pendingCode && DB[MASTER.pendingCode])p.packageCodes.push(MASTER.pendingCode);
    plans.push(p);
    savePlansMaster(plans);
    MASTER.pendingCode=null;
    window.closeStudyPlanCreator();
    if(route.screen==='studyPlanDetail') window.renderStudyPlanDetail();
    window.renderStudyPlans();
  };

  window.openStudyPlanEdit=function(id){
    const p=getPlanMaster(id);if(!p)return;
    MASTER.editId=id;
    if(has('studyPlanEditName'))has('studyPlanEditName').value=p.name;
    if(has('studyPlanEditDesc'))has('studyPlanEditDesc').value=p.description||'';
    if(has('studyPlanEditError'))has('studyPlanEditError').textContent='';
    const m=has('studyPlanEditModal');
    if(m){m.classList.add('show');m.setAttribute('aria-hidden','false');}
    setTimeout(()=>has('studyPlanEditName')?.focus(),50);
  };

  window.closeStudyPlanEdit=function(){
    const m=has('studyPlanEditModal');
    if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}
    MASTER.editId=null;
  };

  window.saveStudyPlanEdit=function(){
    const id=String(MASTER.editId||'');
    if(!id)return;
    const name=String(has('studyPlanEditName')?.value||'').trim();
    const desc=String(has('studyPlanEditDesc')?.value||'').trim();
    const err=has('studyPlanEditError');
    if(name.length<2){if(err)err.textContent='Nama rencana minimal 2 karakter.';return}

    /* Read the latest local state at save time. Do not mutate an object
       captured before the modal opened; this keeps the edit path isolated
       from concurrent cloud merges and other plan actions. */
    const plans=plansStoreMaster();
    const index=plans.findIndex(x=>String(x.id)===id);
    if(index<0){if(err)err.textContent='Rencana tidak ditemukan. Silakan buka ulang Rencana.';return}

    const duplicate=plans.some((x,i)=>i!==index&&String(x.name||'').trim().toLowerCase()===name.toLowerCase());
    if(duplicate){if(err)err.textContent='Nama rencana tersebut sudah digunakan.';return}

    const current=plans[index];
    const nextUpdatedAt=Math.max(Date.now(),Number(current.updatedAt||0)+1);
    plans[index]={...current,name,description:desc,updatedAt:nextUpdatedAt};

    /* Persist locally first. Cloud sync is secondary and receives this
       already-committed state, so the UI never depends on network timing. */
    savePlansMaster(plans);
    if(typeof flushCloudSync==='function')flushCloudSync();

    window.closeStudyPlanEdit();
    window.renderStudyPlans();
    if(route.screen==='studyPlanDetail' && String(route.studyPlanId||'')===id){
      window.renderStudyPlanDetail();
    }
  };

  window.deleteStudyPlan=function(id){
    const p=getPlanMaster(id);if(!p)return;
    appConfirm('Hapus rencana belajar?','Rencana “'+p.name+'” akan dihapus. Paket dan progres belajarmu tetap aman.',()=>{
      const store=readStore();
      const deleted=store._deletedStudyPlans&&typeof store._deletedStudyPlans==='object'?store._deletedStudyPlans:{};
      deleted[String(id)]=Date.now();
      store._deletedStudyPlans=deleted;
      store._studyPlans=plansStoreMaster().filter(x=>String(x.id)!==String(id));
      writeStore(store);
      scheduleCloudSync();
      if(route.screen==='studyPlanDetail'&&String(route.studyPlanId)===String(id))window.openStudyPlans(true);
      else window.renderStudyPlans();
    },{icon:'⌫',okText:'Hapus',danger:true});
  };

  window.removePackageFromStudyPlan=function(id,code){
    const p=getPlanMaster(id);if(!p)return;
    p.packageCodes=(p.packageCodes||[]).filter(x=>x!==code);
    p.updatedAt=Date.now();
    savePlansMaster(plansStoreMaster());
    if(route.screen==='studyPlanDetail'&&String(route.studyPlanId)===String(id))window.renderStudyPlanDetail();
    window.renderStudyPlans();
  };

  window.toggleStudyPlanMenu=function(id){
    const target=has('planMenu_'+id);if(!target)return;
    const was=target.classList.contains('show');
    document.querySelectorAll('.studyPlanCardMenu.show').forEach(x=>x.classList.remove('show'));
    if(!was)target.classList.add('show');
  };

  /* ---------- Make picker selection / close behavior deterministic ---------- */

  document.addEventListener('click',e=>{
    const modal=e.target.closest?.('#studyPlanPickerModal');
    if(!modal)return;
    if(e.target===modal){
      window.closeStudyPlanPicker();
    }
  });

  /* Re-render source/list when cloud progress refreshes without breaking UI. */
  const oldPullForMaster=window.pullCloudState;
  if(typeof oldPullForMaster==='function' && !MASTER.pullWrapped){
    MASTER.pullWrapped=true;
    window.pullCloudState=async function(force=false){
      const result=await oldPullForMaster(force);
      try{
        if(route.screen==='packages' && typeof window.renderPackagesScreen==='function')window.renderPackagesScreen();
        if(route.screen==='studyPlans')window.renderStudyPlans();
        if(route.screen==='studyPlanDetail')window.renderStudyPlanDetail();
        if(route.screen==='home')renderHome();
      }catch(e){}
      return result;
    };
  }

  /* Initial normalization after all previous patches/data integrations. */
  try{
    if(typeof window.renderLevelsScreen==='function')window.renderLevelsScreen();
    if(route.screen==='packages' && typeof window.renderPackagesScreen==='function')window.renderPackagesScreen();
    else if(route.screen==='studyPlans')window.renderStudyPlans();
    else if(route.screen==='studyPlanDetail')window.renderStudyPlanDetail();
    renderScoresMaster();
    window.renderNavState();
  }catch(e){
    console.warn('Master reliability initialization:',e);
  }

  MASTER.ready=true;
})();
