/* Source module: study plan feature.
 * Exact extraction from the prior inline script block.
 * Preserve execution order and legacy globals during this rebuild.
 */

(function(){
  const PLAN_KEY='_studyPlans';
  let studyPlanPickerCode=null;
  let studyPlanPickerPlanId=null;
  let studyPlanDetailId=null;
  let studyPlanEditId=null;
  let studyPlanPickerQuery="";
  let studyPlanPickerLevel=4;
  let studyPlanPickerSource="hsk:4";
  let suppressPackageClickUntil=0;
  function plansStore(){const s=readStore();return Array.isArray(s[PLAN_KEY])?s[PLAN_KEY]:[]}
  function savePlans(plans){const s=readStore();s[PLAN_KEY]=plans;writeStore(s);scheduleCloudSync()}
  function getPlan(id){return plansStore().find(p=>p.id===id)||null}
  function packageTitle(code){return 'Paket '+code}
  function packageStatsSafe(code){try{return packageStats(code)||{answered:0,total:0,pct:0}}catch(e){return {answered:0,total:0,pct:0}}}
  function planStats(p){const total=p.packageCodes.length;let done=0,answered=0,questions=0;p.packageCodes.forEach(code=>{const st=packageStatsSafe(code);if(st.total&&st.answered>=st.total)done++;answered+=st.answered||0;questions+=st.total||0});return {total,done,answered,questions,pct:total?Math.round(done/total*100):0}}
  function escPlan(v){return typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function uid(){return 'sp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
  function openStudyPlans(push=true){route={screen:'studyPlans',packageCode:null,type:null,sectionIndex:null};studyPlanDetailId=null;renderStudyPlans();setScreen('studyPlans',push);window.scrollTo({top:0,left:0,behavior:'auto'})}
  function renderStudyPlans(){const el=$('studyPlansGrid');if(!el)return;const plans=plansStore();if(!plans.length){el.innerHTML='<div class="studyPlanEmpty"><strong>Belum ada rencana belajar</strong><span>Kumpulkan paket penting untuk membuat playlist latihanmu sendiri.</span><br><button class="btn primary" type="button" onclick="openStudyPlanCreator()">＋ Buat Rencana Baru</button></div>';return}el.innerHTML=plans.map(p=>{const st=planStats(p);return `<article class="studyPlanCard" onclick="openStudyPlan('${escPlan(p.id)}')"><div class="studyPlanCardTop"><div class="studyPlanIcon">☷</div><button class="studyPlanMenu" type="button" onclick="event.stopPropagation();toggleStudyPlanMenu('${escPlan(p.id)}')" aria-label="Menu rencana">⋯</button></div><div class="studyPlanCardMenu" id="planMenu_${escPlan(p.id)}"><button type="button" onclick="event.stopPropagation();openStudyPlanEdit('${escPlan(p.id)}')">Edit rencana</button><button type="button" onclick="event.stopPropagation();deleteStudyPlan('${escPlan(p.id)}')">Hapus rencana</button></div><h3>${escPlan(p.name)}</h3><div class="studyPlanDesc">${escPlan(p.description||'Belum ada deskripsi.')}</div><div class="studyPlanMeta"><span>${st.total} paket · ${st.done} selesai</span><span class="studyPlanPct">${st.pct}%</span></div><div class="studyPlanBar"><i style="width:${st.pct}%"></i></div></article>`}).join('')+`<button class="studyPlanCard" type="button" onclick="openStudyPlanCreator()"><div class="studyPlanIcon">＋</div><h3>Buat Rencana Baru</h3><div class="studyPlanDesc">Buat playlist untuk tujuan belajar yang berbeda.</div></button>`}
  function openStudyPlan(id,push=true){const p=getPlan(id);if(!p){openStudyPlans(push);return}studyPlanDetailId=id;route={screen:'studyPlanDetail',packageCode:null,type:null,sectionIndex:null};renderStudyPlanDetail();setScreen('studyPlanDetail',push);window.scrollTo({top:0,left:0,behavior:'auto'})}
  function renderStudyPlanDetail(){const p=getPlan(studyPlanDetailId),head=$('studyPlanDetailHead'),list=$('studyPlanPackages');if(!p||!head||!list){openStudyPlans(false);return}const st=planStats(p);$('studyPlanDetailCrumb').textContent=p.name;head.innerHTML=`<div class="studyPlanDetailTop"><div><div class="sectionKicker">RENCANA BELAJAR</div><div class="studyPlanDetailTitle">${escPlan(p.name)}</div><div class="studyPlanDetailDesc">${escPlan(p.description||'Susun paket sesuai target belajarmu.')}</div><div class="studyPlanContextBadge">${st.total} paket · ${st.done} selesai · ${st.pct}%</div></div><div class="studyPlanDetailActions"><button class="btn" type="button" onclick="openStudyPlanAddPicker('${escPlan(p.id)}')">＋ Tambah paket</button><button class="btn" type="button" onclick="openStudyPlanEdit('${escPlan(p.id)}')">✎ Edit</button><button class="btn primary" type="button" onclick="continueStudyPlan('${escPlan(p.id)}')">▶ Lanjutkan</button></div></div><div class="studyPlanBar" style="margin-top:19px"><i style="width:${st.pct}%"></i></div>`;if(!p.packageCodes.length){list.innerHTML=`<div class="studyPlanAddHint">Belum ada paket di rencana ini.</div><button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escPlan(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`;return}list.innerHTML=p.packageCodes.map((code,i)=>{const x=packageStatsSafe(code),status=x.total&&x.answered>=x.total?'Selesai':x.answered?'Sedang berjalan':'Belum dimulai';return `<div class="studyPlanPackage ${x.total&&x.answered>=x.total?'isDone':x.answered?'isProgress':'isNew'}" style="--pkg-pct:${x.pct||0}%" role="button" tabindex="0" onclick="openPackage('${escPlan(code)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPackage('${escPlan(code)}')}" aria-label="Buka ${escPlan(packageTitle(code))}"><div class="studyPlanPackageNum">${String(i+1).padStart(2,'0')}</div><div class="studyPlanPackageMain"><strong>${escPlan(packageTitle(code))}</strong><span>${x.answered}/${x.total} soal terjawab · ${status}</span><div class="studyPlanPackageBar"><i></i></div></div><span class="studyPlanPackagePct">${x.pct||0}%</span><div class="studyPlanPackageActions"><button type="button" onclick="event.stopPropagation();openPackage('${escPlan(code)}')" title="Buka paket"><span class="material-symbols-rounded">arrow_forward</span></button><button type="button" onclick="event.stopPropagation();removePackageFromStudyPlan('${escPlan(p.id)}','${escPlan(code)}')" title="Hapus dari rencana"><span class="material-symbols-rounded">delete</span></button></div></div>`}).join('')+`<button type="button" class="studyPlanAddHint studyPlanAddButton" onclick="openStudyPlanAddPicker('${escPlan(p.id)}')">＋ Tambahkan paket ke rencana ini</button>`}
  function continueStudyPlan(id){const p=getPlan(id);if(!p||!p.packageCodes.length)return;const target=p.packageCodes.find(code=>{const st=packageStatsSafe(code);return !st.total||st.answered<st.total})||p.packageCodes[0];openPackage(target)}
  function openStudyPlanCreator(){const pendingCode=studyPlanPickerCode;closeStudyPlanPicker();studyPlanPickerCode=pendingCode;$('studyPlanNameInput').value='';$('studyPlanDescInput').value='';$('studyPlanCreatorError').textContent='';$('studyPlanCreatorModal').classList.add('show');$('studyPlanCreatorModal').setAttribute('aria-hidden','false');setTimeout(()=>$('studyPlanNameInput')?.focus(),50)}
  function closeStudyPlanCreator(){$('studyPlanCreatorModal').classList.remove('show');$('studyPlanCreatorModal').setAttribute('aria-hidden','true')}
  function createStudyPlan(){const pendingCode=studyPlanPickerCode;const name=String($('studyPlanNameInput')?.value||'').trim();const desc=String($('studyPlanDescInput')?.value||'').trim();if(name.length<2){$('studyPlanCreatorError').textContent='Nama rencana minimal 2 karakter.';return}const plans=plansStore();if(plans.some(p=>p.name.toLowerCase()===name.toLowerCase())){$('studyPlanCreatorError').textContent='Nama rencana tersebut sudah digunakan.';return}const p={id:uid(),name,description:desc,packageCodes:[],createdAt:Date.now(),updatedAt:Date.now()};plans.push(p);if(pendingCode&&!p.packageCodes.includes(pendingCode))p.packageCodes.push(pendingCode);savePlans(plans);closeStudyPlanCreator();studyPlanPickerCode=pendingCode;if(pendingCode){renderStudyPlanPicker();}renderStudyPlans();if(route.screen==='studyPlanDetail')renderStudyPlanDetail()}
  function studyPlanSourceOptions(){
    const dbCodes=Object.keys(DB);
    const out=[{value:'all',label:'Semua materi',group:'Semua'}];

    // Hanya tampilkan level HSK yang benar-benar memiliki paket di database.
    // Level yang belum tersedia tidak perlu ditampilkan di picker.
    const availableHsk=new Set();
    dbCodes.forEach(code=>{
      const m=String(code).trim().match(/^H(\d+)\d+$/i);
      if(m) availableHsk.add(Number(m[1]));
    });
    [...availableHsk].sort((a,b)=>a-b).forEach(n=>{
      out.push({value:'hsk:'+n,label:'HSK '+n,group:'HSK'});
    });

    // Workbook juga dibuat dinamis berdasarkan keluarga workbook yang benar-benar ada.
    const wb={};
    dbCodes.forEach(code=>{
      const m=String(code).trim().match(/^WB(\d+)([A-Za-z]+?)(?:\d|$)/i);
      if(m){
        const key='WB'+m[1]+m[2].toUpperCase();
        wb[key]='Workbook HSK'+m[1]+m[2].toLowerCase();
      }
    });
    Object.keys(wb).sort().forEach(key=>out.push({value:'wb:'+key,label:wb[key],group:'Workbook'}));
    return out;
  }
  function studyPlanSourceLabel(source){const hit=studyPlanSourceOptions().find(x=>x.value===source);return hit?hit.label:'Semua materi'}
  function studyPlanCodesForSource(source){
    const key=String(source||'all').trim();
    const dbCodes=Object.keys(DB);
    if(key==='all') return dbCodes;
    if(/^hsk:\d+$/i.test(key)){
      const n=key.slice(4);
      return dbCodes.filter(code=>new RegExp('^H'+n+'\\d+$','i').test(String(code).trim()));
    }
    if(/^wb:[a-z0-9]+$/i.test(key)){
      const prefix=key.slice(3).trim().toUpperCase();
      // Workbook families use prefixes such as WB4A and WB4B.
      // Require the remainder to be numeric so HSK packages can never leak into this list.
      const escaped=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp('^'+escaped+'\\d+$','i');
      return dbCodes.filter(code=>re.test(String(code).trim()));
    }
    return [];
  }
  function renderStudyPlanSourceOptions(){
    const sel=$('studyPlanPickerSource');if(!sel)return;
    const current=studyPlanPickerSource;const opts=studyPlanSourceOptions();
    const groups={};opts.forEach(o=>(groups[o.group]??=[]).push(o));
    sel.innerHTML=Object.entries(groups).map(([g,items])=>g==='Semua'?items.map(o=>`<option value="${escPlan(o.value)}">${escPlan(o.label)}</option>`).join(''):`<optgroup label="${escPlan(g)}">${items.map(o=>`<option value="${escPlan(o.value)}">${escPlan(o.label)}</option>`).join('')}</optgroup>`).join('');
    sel.value=opts.some(o=>o.value===current)?current:(opts.find(o=>o.value==='hsk:4')?.value||'all');
    studyPlanPickerSource=sel.value;
  }
  function selectStudyPlanPickerSource(source){
    const value=String(source||'all').trim();
    studyPlanPickerSource=value;
    studyPlanPickerQuery='';
    const input=$('studyPlanPickerSearchInput');
    if(input)input.value='';
    renderStudyPlanAddPicker();
  }
  function studyPlanLevelCodes(level){return studyPlanCodesForSource('hsk:'+Number(level));}
  function selectStudyPlanPickerLevel(level){selectStudyPlanPickerSource('hsk:'+Number(level));}
  function syncStudyPlanPickerLevel(){renderStudyPlanSourceOptions()}
  function openStudyPlanAddPicker(planId){const p=getPlan(planId);if(!p)return;studyPlanPickerPlanId=planId;studyPlanPickerCode=null;studyPlanPickerQuery='';studyPlanPickerSource='hsk:4';renderStudyPlanAddPicker();$('studyPlanPickerModal').classList.add('show');$('studyPlanPickerModal').setAttribute('aria-hidden','false')}
  function renderStudyPlanAddPicker(){const p=getPlan(studyPlanPickerPlanId),title=$('studyPlanPickerPackage'),el=$('studyPlanPickerList'),input=$('studyPlanPickerSearchInput'),wrap=$('studyPlanPickerSourceWrap');if(!p||!el)return;if(title)title.textContent='Pilih paket untuk ditambahkan ke '+p.name;if(wrap)wrap.hidden=false;renderStudyPlanSourceOptions();if(input){input.placeholder='Cari paket...';input.value=studyPlanPickerQuery||'';}const q=String(studyPlanPickerQuery||'').trim().toLowerCase();const source=studyPlanPickerSource;const codes=studyPlanCodesForSource(source).filter(code=>{const d=DB[code]||{};const titleText=String(d.title||packageTitle(code)).toLowerCase();return !q||code.toLowerCase().includes(q)||titleText.includes(q);});if(!codes.length){const label=studyPlanSourceLabel(source);el.innerHTML=`<div class="studyPlanPickerEmpty">${q?'Paket yang kamu cari tidak ditemukan.':`Belum ada paket tersedia untuk ${escPlan(label)}.`}</div>`;return}el.innerHTML=codes.map(code=>{const st=packageStatsSafe(code),d=DB[code]||{},titleText=d.title||packageTitle(code),has=p.packageCodes.includes(code);return `<button class="studyPlanPick ${has?'isAdded':''}" type="button" aria-pressed="${has?'true':'false'}" onclick="addPackageDirectlyToStudyPlan('${escPlan(p.id)}','${escPlan(code)}')"><div class="studyPlanPickIcon">☷</div><div class="studyPlanPickMain"><strong>${escPlan(titleText)}</strong><span>${st.answered}/${st.total} soal terjawab · ${st.pct||0}%</span></div><span class="studyPlanPickState">${has?'✓ Ditambahkan':'＋ Tambahkan'}</span></button>`}).join('')}
  function addPackageDirectlyToStudyPlan(id,code){const plans=plansStore(),p=plans.find(x=>x.id===id);if(!p)return;const exists=p.packageCodes.includes(code);p.packageCodes=exists?p.packageCodes.filter(x=>x!==code):[...p.packageCodes,code];p.updatedAt=Date.now();savePlans(plans);renderStudyPlanAddPicker();renderStudyPlans();if(route.screen==='studyPlanDetail'&&studyPlanDetailId===id)renderStudyPlanDetail()}
  function openStudyPlanPicker(code){studyPlanPickerPlanId=null;studyPlanPickerCode=code;studyPlanPickerQuery='';studyPlanPickerSource='all';renderStudyPlanPicker();$('studyPlanPickerModal').classList.add('show');$('studyPlanPickerModal').setAttribute('aria-hidden','false')}
  function renderStudyPlanPicker(){studyPlanPickerPlanId=null;const code=studyPlanPickerCode;const title=$('studyPlanPickerPackage');if(title)title.textContent=packageTitle(code||'');const el=$('studyPlanPickerList'),input=$('studyPlanPickerSearchInput'),wrap=$('studyPlanPickerSourceWrap');if(!el)return;if(wrap)wrap.hidden=true;if(input){input.placeholder='Cari rencana...';input.value=studyPlanPickerQuery||'';}const q=String(studyPlanPickerQuery||'').trim().toLowerCase();const plans=plansStore().filter(p=>!q||p.name.toLowerCase().includes(q)||(p.description||'').toLowerCase().includes(q));if(!plans.length){el.innerHTML=`<div class="studyPlanPickerEmpty">${q?'Rencana yang kamu cari tidak ditemukan.':'Belum ada rencana. Buat rencana baru untuk menyimpan paket ini.'}</div>`;return}el.innerHTML=plans.map(p=>{const has=p.packageCodes.includes(code);const st=planStats(p);return `<button class="studyPlanPick" type="button" onclick="togglePackageInStudyPlan('${escPlan(p.id)}','${escPlan(code)}')"><div class="studyPlanPickIcon">☷</div><div class="studyPlanPickMain"><strong>${escPlan(p.name)}</strong><span>${st.total} paket · ${st.pct}% selesai</span></div><span class="studyPlanPickState">${has?'✓ Ditambahkan':'＋ Tambahkan'}</span></button>`}).join('')}
function filterStudyPlanPicker(value){studyPlanPickerQuery=String(value||'');if(studyPlanPickerPlanId)renderStudyPlanAddPicker();else renderStudyPlanPicker()}

  function togglePackageInStudyPlan(id,code){const plans=plansStore(),p=plans.find(x=>x.id===id);if(!p)return;if(p.packageCodes.includes(code))p.packageCodes=p.packageCodes.filter(x=>x!==code);else p.packageCodes.push(code);p.updatedAt=Date.now();savePlans(plans);if(studyPlanPickerPlanId===id)renderStudyPlanAddPicker();else renderStudyPlanPicker();renderStudyPlans();if(route.screen==='studyPlanDetail'&&studyPlanDetailId===id)renderStudyPlanDetail()}
  function closeStudyPlanPicker(){studyPlanPickerCode=null;studyPlanPickerPlanId=null;studyPlanPickerQuery='';studyPlanPickerLevel=4;studyPlanPickerSource='hsk:4';$('studyPlanPickerModal').classList.remove('show');$('studyPlanPickerModal').setAttribute('aria-hidden','true')}
  function openStudyPlanEdit(id){const p=getPlan(id);if(!p)return;studyPlanEditId=id;$('studyPlanEditName').value=p.name;$('studyPlanEditDesc').value=p.description||'';$('studyPlanEditError').textContent='';$('studyPlanEditModal').classList.add('show');$('studyPlanEditModal').setAttribute('aria-hidden','false');setTimeout(()=>$('studyPlanEditName')?.focus(),50)}
  function closeStudyPlanEdit(){studyPlanEditId=null;$('studyPlanEditModal').classList.remove('show');$('studyPlanEditModal').setAttribute('aria-hidden','true')}
  function saveStudyPlanEdit(){const plans=plansStore(),p=plans.find(x=>x.id===studyPlanEditId);if(!p)return;const name=String($('studyPlanEditName').value||'').trim();if(name.length<2){$('studyPlanEditError').textContent='Nama rencana minimal 2 karakter.';return}if(plans.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase())){$('studyPlanEditError').textContent='Nama rencana tersebut sudah digunakan.';return}p.name=name;p.description=String($('studyPlanEditDesc').value||'').trim();p.updatedAt=Date.now();savePlans(plans);closeStudyPlanEdit();renderStudyPlans();if(route.screen==='studyPlanDetail'&&studyPlanDetailId===p.id)renderStudyPlanDetail()}
  function deleteStudyPlan(id){const p=getPlan(id);if(!p)return;appConfirm('Hapus rencana belajar?','Rencana “'+p.name+'” akan dihapus. Paket dan progres belajarmu tetap aman.',()=>{savePlans(plansStore().filter(x=>x.id!==id));if(route.screen==='studyPlanDetail'&&studyPlanDetailId===id)openStudyPlans();else renderStudyPlans()},{icon:'⌫',okText:'Hapus',danger:true})}
  function removePackageFromStudyPlan(id,code){const plans=plansStore(),p=plans.find(x=>x.id===id);if(!p)return;p.packageCodes=p.packageCodes.filter(x=>x!==code);p.updatedAt=Date.now();savePlans(plans);renderStudyPlanDetail();renderStudyPlans()}
  function toggleStudyPlanMenu(id){const target=$('planMenu_'+id);if(!target)return;const wasOpen=target.classList.contains('show');document.querySelectorAll('.studyPlanCardMenu.show').forEach(x=>x.classList.remove('show'));if(!wasOpen)target.classList.add('show')}
  document.addEventListener('pointerdown',function(ev){const openMenu=document.querySelector('.studyPlanCardMenu.show');if(!openMenu)return;const card=openMenu.closest('.studyPlanCard');if(card&&!card.contains(ev.target))openMenu.classList.remove('show')});
  document.addEventListener('click',function(e){
    const btn=e.target.closest('#studyPlanPickerModal .studyPlanPickerActions button');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeStudyPlanPicker();
  },true);
})();
