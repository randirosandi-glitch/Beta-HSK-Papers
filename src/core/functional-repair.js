/* Source module: functional repair layer.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';

  const R=window.__functionalRepairV4=window.__functionalRepairV4||{};
  const $id=id=>document.getElementById(id);
  const escV4=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db=()=>((typeof DB!=='undefined'&&DB)?DB:{});
  const dbCodes=()=>Object.keys(db());

  function materialList(){
    const h=new Map(),w=new Map();
    dbCodes().forEach(code=>{
      const c=String(code);
      let m=c.match(/^H(\d+)\d{4}[A-Za-z]?$/i);
      if(m){
        const key='hsk:'+Number(m[1]);
        if(!h.has(key))h.set(key,{key,kind:'hsk',level:Number(m[1]),label:'HSK '+Number(m[1]),codes:[]});
        h.get(key).codes.push(c);
        return;
      }
      m=c.match(/^WB(\d+)([A-Za-z]+)(\d+)$/i);
      if(m){
        const key='wb:WB'+m[1]+m[2].toUpperCase();
        if(!w.has(key))w.set(key,{key,kind:'workbook',level:Number(m[1]),suffix:m[2].toLowerCase(),label:'Workbook HSK'+m[1]+m[2].toLowerCase(),codes:[]});
        w.get(key).codes.push(c);
      }
    });
    h.forEach(x=>x.codes.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));
    w.forEach(x=>x.codes.sort((a,b)=>{
      const na=Number((a.match(/\d+$/)||['0'])[0]),nb=Number((b.match(/\d+$/)||['0'])[0]);
      return na-nb||a.localeCompare(b);
    }));
    return [...h.values()].sort((a,b)=>a.level-b.level)
      .concat([...w.values()].sort((a,b)=>a.level-b.level||a.suffix.localeCompare(b.suffix)));
  }
  function mat(key){return materialList().find(x=>x.key===String(key))||null}
  function plans(){
    try{
      const s=readStore();
      return Array.isArray(s._studyPlans)?s._studyPlans:[];
    }catch(e){return[]}
  }
  function savePlans(v){
    const s=readStore();s._studyPlans=v;writeStore(s);
    try{scheduleCloudSync()}catch(e){}
  }
  function plan(id){return plans().find(p=>String(p.id)===String(id))||null}
  function stat(p){
    const codes=Array.isArray(p?.packageCodes)?p.packageCodes:[];
    let done=0;
    codes.forEach(c=>{const x=packageStats(c);if(x.total&&x.answered>=x.total)done++});
    return {total:codes.length,done,pct:codes.length?Math.round(done/codes.length*100):0};
  }

  /* ------------------------------------------------------------
     STUDY PLAN PICKER — no inline onclick dependency
     ------------------------------------------------------------ */
  R.picker={mode:'plan',planId:null,code:null,source:'hsk:4',query:''};

  function renderPicker(){
    const list=$id('studyPlanPickerList');if(!list)return;
    const input=$id('studyPlanPickerSearchInput');
    const source=$id('studyPlanPickerSource');
    const state=R.picker;

    if(source){
      const mats=materialList();
      const hs=mats.filter(m=>m.kind==='hsk'),wb=mats.filter(m=>m.kind==='workbook');
      let opts='<option value="all">Semua materi</option>';
      if(hs.length)opts+='<optgroup label="HSK">'+hs.map(m=>`<option value="${escV4(m.key)}">${escV4(m.label)}</option>`).join('')+'</optgroup>';
      if(wb.length)opts+='<optgroup label="Workbook">'+wb.map(m=>`<option value="${escV4(m.key)}">${escV4(m.label)}</option>`).join('')+'</optgroup>';
      source.innerHTML=opts;
      if(![...source.options].some(o=>o.value===state.source))state.source='hsk:4';
      source.value=state.source;
    }

    if(state.mode==='package'){
      if($id('studyPlanPickerSourceWrap'))$id('studyPlanPickerSourceWrap').hidden=true;
      if(input){input.placeholder='Cari rencana...';input.value=state.query}
      const q=state.query.trim().toLowerCase();
      const rows=plans().filter(p=>!q||String(p.name||'').toLowerCase().includes(q)||String(p.description||'').toLowerCase().includes(q));
      if(!rows.length){list.innerHTML='<div class="studyPlanPickerEmpty">Belum ada rencana belajar.</div>';return}
      list.innerHTML=rows.map(p=>{
        const added=(p.packageCodes||[]).includes(state.code);
        const st=stat(p);
        return `<button class="studyPlanPick ${added?'isAdded':''}" type="button" data-pick-plan="${escV4(p.id)}" data-pick-code="${escV4(state.code)}" aria-pressed="${added?'true':'false'}">
          <div class="studyPlanPickIcon">☷</div><div class="studyPlanPickMain"><strong>${escV4(p.name)}</strong><span>${st.total} paket · ${st.pct}% selesai</span></div>
          <span class="studyPlanPickState">${added?'✓ Ditambahkan':'＋ Tambahkan'}</span>
        </button>`;
      }).join('');
      return;
    }

    if($id('studyPlanPickerSourceWrap'))$id('studyPlanPickerSourceWrap').hidden=false;
    if(input){input.placeholder='Cari paket...';input.value=state.query}
    const q=state.query.trim().toLowerCase();
    const m=mat(state.source);
    const rows=(m?.codes||[]).filter(code=>{
      const d=db()[code]||{};
      return !q||code.toLowerCase().includes(q)||String(d.title||'').toLowerCase().includes(q)||String(d.meta?.lessonTitle||'').toLowerCase().includes(q);
    });
    if(!rows.length){list.innerHTML='<div class="studyPlanPickerEmpty">Paket yang kamu cari tidak ditemukan.</div>';return}
    const p=plan(state.planId);
    if(!p){list.innerHTML='<div class="studyPlanPickerEmpty">Rencana tidak ditemukan.</div>';return}
    list.innerHTML=rows.map(code=>{
      const added=(p.packageCodes||[]).includes(code),st=packageStats(code),d=db()[code]||{};
      return `<button class="studyPlanPick ${added?'isAdded':''}" type="button" data-pick-plan="${escV4(p.id)}" data-pick-code="${escV4(code)}" aria-pressed="${added?'true':'false'}">
        <div class="studyPlanPickIcon">☷</div><div class="studyPlanPickMain"><strong>${escV4(d.title||('Paket '+code))}</strong><span>${st.answered}/${st.total} soal terjawab · ${st.pct||0}%</span></div>
        <span class="studyPlanPickState">${added?'✓ Ditambahkan':'＋ Tambahkan'}</span>
      </button>`;
    }).join('');
  }

  function openPickerForPlan(id){
    const p=plan(id);if(!p)return;
    R.picker={mode:'plan',planId:p.id,code:null,source:mat('hsk:4')?'hsk:4':(materialList()[0]?.key||'all'),query:''};
    const modal=$id('studyPlanPickerModal');if(!modal)return;
    renderPicker();modal.classList.add('show');modal.setAttribute('aria-hidden','false');
  }
  function openPickerForPackage(code){
    if(!db()[code])return;
    R.picker={mode:'package',planId:null,code,source:'all',query:''};
    const modal=$id('studyPlanPickerModal');if(!modal)return;
    renderPicker();modal.classList.add('show');modal.setAttribute('aria-hidden','false');
  }
  function closePicker(){
    const modal=$id('studyPlanPickerModal');
    if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true')}
    R.picker={mode:'plan',planId:null,code:null,source:'hsk:4',query:''};
  }
  function togglePick(planId,code){
    const all=plans(),p=all.find(x=>String(x.id)===String(planId));
    if(!p||!db()[code])return;
    if(!Array.isArray(p.packageCodes))p.packageCodes=[];
    const idx=p.packageCodes.indexOf(code);
    if(idx>=0)p.packageCodes.splice(idx,1);else p.packageCodes.push(code);
    p.updatedAt=Date.now();
    savePlans(all);
    renderPicker();
    if(typeof window.renderStudyPlans==='function')window.renderStudyPlans();
    if(typeof window.renderStudyPlanDetail==='function' && route.screen==='studyPlanDetail')window.renderStudyPlanDetail();
  }

  /* Replace the global picker functions used by all existing buttons. */
  window.openStudyPlanAddPicker=openPickerForPlan;
  window.openStudyPlanPicker=openPickerForPackage;
  window.renderStudyPlanPicker=renderPicker;
  window.renderStudyPlanAddPicker=renderPicker;
  window.selectStudyPlanPickerSource=function(v){R.picker.source=String(v||'all');R.picker.query='';renderPicker()};
  window.filterStudyPlanPicker=function(v){R.picker.query=String(v||'');renderPicker()};
  window.closeStudyPlanPicker=closePicker;
  window.addPackageDirectlyToStudyPlan=togglePick;
  window.togglePackageInStudyPlan=togglePick;

  /* Capture click on picker rows so older inline handlers cannot double-toggle. */
  document.addEventListener('click',function(e){
    const b=e.target.closest?.('#studyPlanPickerList .studyPlanPick[data-pick-plan][data-pick-code]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    togglePick(b.dataset.pickPlan,b.dataset.pickCode);
  },true);

  /* ------------------------------------------------------------
     STUDY PLAN DETAIL — open package with explicit return context
     ------------------------------------------------------------ */
  function renderPlanDetailV4(){
    const p=plan(route.studyPlanId); // route is the source of truth
    const head=$id('studyPlanDetailHead'),list=$id('studyPlanPackages');
    if(!p||!head||!list){window.openStudyPlans(false);return}
    const st=stat(p);
    if($id('studyPlanDetailCrumb'))$id('studyPlanDetailCrumb').textContent=p.name;
    head.innerHTML=`<div class="studyPlanDetailTop"><div>
      <div class="sectionKicker">RENCANA BELAJAR</div>
      <div class="studyPlanDetailTitle">${escV4(p.name)}</div>
      <div class="studyPlanDetailDesc">${escV4(p.description||'Susun paket sesuai target belajarmu.')}</div>
      <div class="studyPlanContextBadge">${st.total} paket · ${st.done} selesai · ${st.pct}%</div>
    </div><div class="studyPlanDetailActions">
      <button class="btn" type="button" onclick="openStudyPlanAddPicker('${escV4(p.id)}')">＋ Tambah paket</button>
      <button class="btn" type="button" onclick="openStudyPlanEdit('${escV4(p.id)}')">✎ Edit</button>
      <button class="btn primary" type="button" onclick="continueStudyPlan('${escV4(p.id)}')">▶ Lanjutkan</button>
    </div></div><div class="studyPlanBar" style="margin-top:19px"><i style="width:${st.pct}%"></i></div>`;

    if(!p.packageCodes?.length){
      list.innerHTML=`<div class="studyPlanAddHint">Belum ada paket di rencana ini.</div>
        <button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escV4(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`;
      return;
    }

    list.innerHTML=`<div class="studyPlanLongPressHint">Ketuk paket untuk membuka. Gunakan tombol hapus untuk mengeluarkannya dari rencana.</div>`+
      p.packageCodes.map((code,i)=>{
        const x=packageStats(code);
        const status=x.total&&x.answered>=x.total?'Selesai':x.answered?'Sedang berjalan':'Belum dimulai';
        return `<div class="studyPlanPackage ${x.total&&x.answered>=x.total?'isDone':''}" role="button" tabindex="0" data-plan-id="${escV4(p.id)}" data-package-code="${escV4(code)}" style="--pkg-pct:${x.pct||0}%"
          aria-label="Buka ${escV4(db()[code]?.title||('Paket '+code))}">
          <div class="studyPlanPackageNum">${String(i+1).padStart(2,'0')}</div>
          <div class="studyPlanPackageMain"><strong>${escV4(db()[code]?.title||('Paket '+code))}</strong><span>${x.answered}/${x.total} soal terjawab · ${status}</span></div>
          <span class="studyPlanPackagePct">${x.pct||0}%</span>
          <div class="studyPlanPackageActions">
            <button type="button" data-action="open-plan-package" title="Buka paket" aria-label="Buka paket"><span class="material-symbols-rounded" aria-hidden="true">play_arrow</span></button>
            <button type="button" data-action="remove-plan-package" title="Hapus dari rencana" aria-label="Hapus paket dari rencana"><span class="material-symbols-rounded" aria-hidden="true">close</span></button>
          </div>
        </div>`;
      }).join('')+
      `<button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escV4(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`;
  }

  window.renderStudyPlanDetail=renderPlanDetailV4;

  window.openStudyPlans=function(push=true){
    route={screen:'studyPlans',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};
    window.renderStudyPlans();
    setScreen('studyPlans',push);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };
  window.openStudyPlan=function(id,push=true){
    const p=plan(id);if(!p){window.openStudyPlans(push);return}
    route={screen:'studyPlanDetail',packageCode:null,type:null,sectionIndex:null,studyPlanId:p.id};
    renderPlanDetailV4();setScreen('studyPlanDetail',push);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };

  window.continueStudyPlan=function(id){
    const p=plan(id);if(!p||!p.packageCodes?.length)return;
    const target=p.packageCodes.find(c=>{const x=packageStats(c);return !x.total||x.answered<x.total})||p.packageCodes[0];
    R.returnPlanId=p.id;
    window.openPackage(target,true);
  };

  window.openPackageFromStudyPlan=function(planId,code){
    if(!db()[code])return;
    R.returnPlanId=String(planId);
    window.openPackage(code,true);
  };

  /* ------------------------------------------------------------
     TOUCH INTERACTIONS
     - long press plan-detail package => remove from plan
     ------------------------------------------------------------ */
  R.timer=null;R.x=0;R.y=0;R.suppressUntil=0;R.target=null;R.planTarget=null;

  function clearTimer(){
    if(R.timer){clearTimeout(R.timer);R.timer=null}
    R.target?.classList.remove('longPressing');
    R.planTarget?.classList.remove('longPressing');
    R.target=null;R.planTarget=null;
  }

  document.addEventListener('pointerdown',function(e){
    /* Plan-detail rows: long press removes. */
    const row=e.target.closest?.('#studyPlanPackages .studyPlanPackage');
    if(row && e.pointerType!=='mouse'){
      e.stopImmediatePropagation();
      R.planTarget=row;R.x=e.clientX;R.y=e.clientY;clearTimeout(R.timer);
      R.timer=setTimeout(()=>{
        R.timer=null;row.classList.add('longPressing');
        R.suppressUntil=Date.now()+900;
        const id=row.dataset.planId,code=row.dataset.packageCode,p=plan(id);
        if(p){
          appConfirm('Hapus paket dari rencana?','Paket ini akan dikeluarkan dari rencana belajar. Progres paket tetap aman.',()=>{
            const all=plans(),x=all.find(q=>String(q.id)===String(id));
            if(x){x.packageCodes=(x.packageCodes||[]).filter(c=>String(c)!==String(code));x.updatedAt=Date.now();savePlans(all)}
            renderPlanDetailV4();window.renderStudyPlans();
          },{icon:'−',okText:'Hapus',danger:true});
        }
        row.classList.remove('longPressing');
      },650);
      return;
    }

  },true);

  document.addEventListener('pointermove',function(e){
    if(!R.timer)return;
    if(Math.hypot(e.clientX-R.x,e.clientY-R.y)>14)clearTimer();
  },true);
  document.addEventListener('pointerup',clearTimer,true);
  document.addEventListener('pointercancel',clearTimer,true);

  /* Suppress the synthetic click produced after a long press. */
  document.addEventListener('click',function(e){
    if(Date.now()<R.suppressUntil){
      const row=e.target.closest?.('#studyPlanPackages .studyPlanPackage');
      if(row){e.preventDefault();e.stopImmediatePropagation();R.suppressUntil=0;return}
    }

    /* Normal click on a plan package row opens it with return context. */
    const row=e.target.closest?.('#studyPlanPackages .studyPlanPackage');
    if(row){
      e.preventDefault();e.stopImmediatePropagation();
      const id=row.dataset.planId,code=row.dataset.packageCode;
      if(e.target.closest('[data-action="remove-plan-package"]')){
        const all=plans(),p=all.find(x=>String(x.id)===String(id));
        if(p){p.packageCodes=(p.packageCodes||[]).filter(c=>c!==code);p.updatedAt=Date.now();savePlans(all);renderPlanDetailV4();window.renderStudyPlans()}
        return;
      }
      R.returnPlanId=id;
      window.openPackage(code,true);
      return;
    }

  },true);

})();
