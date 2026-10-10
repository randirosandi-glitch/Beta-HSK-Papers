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

  function defaultMaterialKey(){
    const all=allMaterials();
    return all.find(m=>m.key==='hsk:4')?.key || all[0]?.key || 'hsk:4';
  }

  function codesForMaterial(key){
    return materialForKey(key)?.codes.slice() || [];
  }

  function packageDescription(code){
    const d=DB[code]||{};
    const total=packageStats(code)?.total||0;
    const parts=Object.entries(META||{})
      .filter(([t])=>(d[t]||[]).length>0)
      .map(([t,m])=>m.label);
    if(parts.length) return `${total} soal · ${parts.join(' · ')}`;
    return 'Belum ada soal interaktif';
  }

  function packageStatus(code){
    const st=packageStats(code),pct=st.pct||0;
    return pct>=100?'Selesai':pct>0?'Sedang berjalan':'Belum dimulai';
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

  const planState=MASTER.planState || {
    mode:'plan',
    planId:null,
    code:null,
    source:defaultMaterialKey(),
    query:'',
    pendingCode:null
  };
  MASTER.planState=planState;

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

  function materialOptionsMaster(){
    const all=allMaterials();
    return [
      {value:'all',label:'Semua materi',codes:all.flatMap(m=>m.codes)},
      ...all.map(m=>({value:m.key,label:m.label,codes:m.codes}))
    ];
  }

  function sourceCodesMaster(source){
    const opts=materialOptionsMaster();
    return opts.find(o=>o.value===source)?.codes.slice() || [];
  }

  function sourceLabelMaster(source){
    return materialOptionsMaster().find(o=>o.value===source)?.label || 'Semua materi';
  }

  function renderSourceOptionsMaster(){
    const sel=has('studyPlanPickerSource');
    if(!sel)return;
    const opts=materialOptionsMaster();
    const hsk=opts.filter(o=>o.value.startsWith('hsk:'));
    const wb=opts.filter(o=>o.value.startsWith('wb:'));
    let html='<option value="all">Semua materi</option>';
    if(hsk.length) html+='<optgroup label="HSK">'+hsk.map(o=>`<option value="${escHtml(o.value)}">${escHtml(o.label)}</option>`).join('')+'</optgroup>';
    if(wb.length) html+='<optgroup label="Workbook">'+wb.map(o=>`<option value="${escHtml(o.value)}">${escHtml(o.label)}</option>`).join('')+'</optgroup>';
    sel.innerHTML=html;
    if(!opts.some(o=>o.value===planState.source)){
      planState.source=opts.find(o=>o.value===defaultMaterialKey())?.value || 'all';
    }
    sel.value=planState.source;
  }

  function renderStudyPlanPickerMaster(){
    const modal=has('studyPlanPickerModal');
    const list=has('studyPlanPickerList');
    const input=has('studyPlanPickerSearchInput');
    if(!list)return;

    if(planState.mode==='package'){
      if(has('studyPlanPickerSourceWrap')) has('studyPlanPickerSourceWrap').hidden=true;
      if(has('studyPlanPickerPackage')) has('studyPlanPickerPackage').textContent='Pilih rencana untuk '+(DB[planState.code]?.title||('Paket '+planState.code));
      if(input){
        input.placeholder='Cari rencana...';
        input.value=planState.query||'';
      }
      const q=String(planState.query||'').trim().toLowerCase();
      const plans=plansStoreMaster().filter(p=>
        !q || String(p.name||'').toLowerCase().includes(q) || String(p.description||'').toLowerCase().includes(q)
      );
      if(!plans.length){
        list.innerHTML=`<div class="studyPlanPickerEmpty">${q?'Rencana yang kamu cari tidak ditemukan.':'Belum ada rencana. Buat rencana dari menu Rencana.'}</div>`;
        return;
      }
      list.innerHTML=plans.map(p=>{
        const hasCode=Array.isArray(p.packageCodes)&&p.packageCodes.includes(planState.code);
        const st=planStatsMaster(p);
        return `<button class="studyPlanPick ${hasCode?'isAdded':''}" type="button"
          aria-pressed="${hasCode?'true':'false'}"
          onclick="togglePackageInStudyPlan('${escHtml(p.id)}','${escHtml(planState.code)}')">
          <div class="studyPlanPickIcon">☷</div>
          <div class="studyPlanPickMain"><strong>${escHtml(p.name)}</strong><span>${st.total} paket · ${st.pct}% selesai</span></div>
          <span class="studyPlanPickState">${hasCode?'✓ Ditambahkan':'＋ Tambahkan'}</span>
        </button>`;
      }).join('');
      return;
    }

    if(has('studyPlanPickerSourceWrap')) has('studyPlanPickerSourceWrap').hidden=false;
    renderSourceOptionsMaster();
    if(has('studyPlanPickerPackage')) has('studyPlanPickerPackage').textContent='Pilih paket untuk ditambahkan ke '+(getPlanMaster(planState.planId)?.name||'rencana ini');
    if(input){
      input.placeholder='Cari paket...';
      input.value=planState.query||'';
    }

    const q=String(planState.query||'').trim().toLowerCase();
    const codes=sourceCodesMaster(planState.source).filter(code=>{
      const d=DB[code]||{};
      return !q || code.toLowerCase().includes(q)
        || String(d.title||'').toLowerCase().includes(q)
        || String(d.meta?.lessonTitle||'').toLowerCase().includes(q);
    });

    if(!codes.length){
      list.innerHTML=`<div class="studyPlanPickerEmpty">${q?'Paket yang kamu cari tidak ditemukan.':`Belum ada paket tersedia untuk ${escHtml(sourceLabelMaster(planState.source))}.`}</div>`;
      return;
    }

    const p=getPlanMaster(planState.planId);
    list.innerHTML=codes.map(code=>{
      const st=packageStats(code);
      const d=DB[code]||{};
      const hasCode=Array.isArray(p?.packageCodes)&&p.packageCodes.includes(code);
      const title=d.title||('Paket '+code);
      return `<button class="studyPlanPick ${hasCode?'isAdded':''}" type="button"
        aria-pressed="${hasCode?'true':'false'}"
        onclick="addPackageDirectlyToStudyPlan('${escHtml(p?.id||'')}','${escHtml(code)}')">
        <div class="studyPlanPickIcon">☷</div>
        <div class="studyPlanPickMain"><strong>${escHtml(title)}</strong><span>${st.answered}/${st.total} soal terjawab · ${st.pct||0}%</span></div>
        <span class="studyPlanPickState">${hasCode?'✓ Ditambahkan':'＋ Tambahkan'}</span>
      </button>`;
    }).join('');
  }

  window.openStudyPlans=function(push=true){
    route={screen:'studyPlans',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};
    planState.mode='plan';
    planState.planId=null;
    planState.code=null;
    planState.query='';
    window.renderStudyPlans();
    setScreen('studyPlans',push);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };

  window.renderStudyPlans=function(){
    const el=has('studyPlansGrid');
    if(!el)return;
    const plans=plansStoreMaster();
    if(!plans.length){
      el.innerHTML='<div class="studyPlanEmpty"><strong>Belum ada rencana belajar</strong><span>Kumpulkan paket penting untuk membuat playlist latihanmu sendiri.</span><br><button class="btn primary" type="button" onclick="openStudyPlanCreator()">＋ Buat Rencana Baru</button></div>';
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
  };

  window.openStudyPlan=function(id,push=true){
    const p=getPlanMaster(id);
    if(!p){window.openStudyPlans(push);return}
    route={screen:'studyPlanDetail',packageCode:null,type:null,sectionIndex:null,studyPlanId:p.id};
    planState.mode='plan';
    planState.planId=p.id;
    planState.code=null;
    planState.query='';
    window.renderStudyPlanDetail();
    setScreen('studyPlanDetail',push);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };

  window.renderStudyPlanDetail=function(){
    const p=getPlanMaster(route.studyPlanId||planState.planId);
    const head=has('studyPlanDetailHead'),list=has('studyPlanPackages');
    if(!p||!head||!list){window.openStudyPlans(false);return}
    planState.planId=p.id;
    const st=planStatsMaster(p);
    if(has('studyPlanDetailCrumb')) has('studyPlanDetailCrumb').textContent=p.name;
    head.innerHTML=`<div class="studyPlanDetailTop"><div>
      <div class="sectionKicker">RENCANA BELAJAR</div>
      <div class="studyPlanDetailTitle">${escHtml(p.name)}</div>
      <div class="studyPlanDetailDesc">${escHtml(p.description||'Susun paket sesuai target belajarmu.')}</div>
      <div class="studyPlanContextBadge">${st.total} paket · ${st.done} selesai · ${st.pct}%</div>
    </div><div class="studyPlanDetailActions">
      <button class="btn" type="button" onclick="openStudyPlanAddPicker('${escHtml(p.id)}')">＋ Tambah paket</button>
      <button class="btn" type="button" onclick="openStudyPlanEdit('${escHtml(p.id)}')">✎ Edit</button>
      <button class="btn primary" type="button" onclick="continueStudyPlan('${escHtml(p.id)}')">▶ Lanjutkan</button>
    </div></div><div class="studyPlanBar" style="margin-top:19px"><i style="width:${st.pct}%"></i></div>`;

    const codes=Array.isArray(p.packageCodes)?p.packageCodes:[];
    if(!codes.length){
      list.innerHTML=`<div class="studyPlanAddHint">Belum ada paket di rencana ini.</div>
        <button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escHtml(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`;
      return;
    }

    list.innerHTML=codes.map((code,i)=>{
      const x=packageStats(code);
      const status=x.total&&x.answered>=x.total?'Selesai':x.answered?'Sedang berjalan':'Belum dimulai';
      return `<div class="studyPlanPackage" role="button" tabindex="0"
        onclick="openPackage('${escHtml(code)}')"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPackage('${escHtml(code)}')}">
        <div class="studyPlanPackageNum">${String(i+1).padStart(2,'0')}</div>
        <div class="studyPlanPackageMain"><strong>${escHtml(DB[code]?.title||('Paket '+code))}</strong><span>${x.answered}/${x.total} soal terjawab · ${status}</span></div>
        <span class="studyPlanPackagePct">${x.pct||0}%</span>
        <div class="studyPlanPackageActions">
          <button type="button" onclick="event.stopPropagation();openPackage('${escHtml(code)}')" title="Buka paket">→</button>
          <button type="button" onclick="event.stopPropagation();removePackageFromStudyPlan('${escHtml(p.id)}','${escHtml(code)}')" title="Hapus dari rencana">×</button>
        </div>
      </div>`;
    }).join('')+`<button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escHtml(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`;
  };

  window.openStudyPlanAddPicker=function(planId){
    const p=getPlanMaster(planId);
    if(!p)return;
    planState.mode='plan';
    planState.planId=p.id;
    planState.code=null;
    planState.query='';
    planState.source=materialForKey(defaultMaterialKey())?.key||'all';
    renderStudyPlanPickerMaster();
    const modal=has('studyPlanPickerModal');
    if(modal){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
  };

  window.openStudyPlanPicker=function(code){
    if(!DB[code])return;
    planState.mode='package';
    planState.code=code;
    planState.planId=null;
    planState.query='';
    renderStudyPlanPickerMaster();
    const modal=has('studyPlanPickerModal');
    if(modal){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
  };

  window.renderStudyPlanPicker=renderStudyPlanPickerMaster;
  window.renderStudyPlanAddPicker=renderStudyPlanPickerMaster;

  window.selectStudyPlanPickerSource=function(source){
    const opts=materialOptionsMaster();
    const value=String(source||'all');
    planState.source=opts.some(o=>o.value===value)?value:'all';
    planState.query='';
    renderStudyPlanPickerMaster();
  };

  window.filterStudyPlanPicker=function(value){
    planState.query=String(value||'');
    renderStudyPlanPickerMaster();
  };

  window.addPackageDirectlyToStudyPlan=function(id,code){
    const p=getPlanMaster(id);
    if(!p||!DB[code])return;
    if(!Array.isArray(p.packageCodes))p.packageCodes=[];
    const exists=p.packageCodes.includes(code);
    p.packageCodes=exists?p.packageCodes.filter(x=>x!==code):[...p.packageCodes,code];
    p.updatedAt=Date.now();
    savePlansMaster(plansStoreMaster());
    renderStudyPlanPickerMaster();
    window.renderStudyPlans();
    if(route.screen==='studyPlanDetail' && String(route.studyPlanId)===String(id)) window.renderStudyPlanDetail();
  };

  window.togglePackageInStudyPlan=function(id,code){
    window.addPackageDirectlyToStudyPlan(id,code);
  };

  window.closeStudyPlanPicker=function(){
    const modal=has('studyPlanPickerModal');
    if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
    planState.mode='plan';
    planState.planId=null;
    planState.code=null;
    planState.query='';
  };

  window.openStudyPlanCreator=function(){
    planState.pendingCode=planState.mode==='package'?planState.code:null;
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
    if(planState.pendingCode && DB[planState.pendingCode])p.packageCodes.push(planState.pendingCode);
    plans.push(p);
    savePlansMaster(plans);
    planState.pendingCode=null;
    window.closeStudyPlanCreator();
    if(route.screen==='studyPlanDetail') window.renderStudyPlanDetail();
    window.renderStudyPlans();
  };

  window.continueStudyPlan=function(id){
    const p=getPlanMaster(id);
    if(!p||!p.packageCodes?.length)return;
    const target=p.packageCodes.find(code=>{
      const st=packageStats(code);
      return !st.total || st.answered<st.total;
    })||p.packageCodes[0];
    window.openPackage(target);
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
