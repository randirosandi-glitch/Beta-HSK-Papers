/* Source module: catalog and package runtime.
 * Exact extraction from the prior inline script block.
 * Preserve execution order and legacy globals during this rebuild.
 */

(function(){
  'use strict';
  const REPO='randirosandi-glitch/latihanhsk', REF='main';
  const TREE_API='https://api.github.com/repos/'+REPO+'/git/trees/'+encodeURIComponent(REF)+'?recursive=1';
  const RAW_BASE='https://raw.githubusercontent.com/'+REPO+'/'+REF+'/';
  const CATALOG_CACHE_KEY='hsk-dynamic-catalog-v6-stable';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});
  const kind=n=>/^HSK\s*\d+/i.test(n)?'hsk':/^Workbook\b/i.test(n)?'workbook':'custom';
  const level=n=>{const m=String(n).match(/^HSK\s*(\d+)/i);return m?Number(m[1]):null};
  const localURL=p=>'./'+String(p).split('/').map(encodeURIComponent).join('/');
  const rawURL=(p,repo=REPO)=>'https://raw.githubusercontent.com/'+repo+'/'+REF+'/'+String(p).split('/').map(encodeURIComponent).join('/');
  const state=window.__hskDatabase={loaded:false,source:null,error:null,groups:[],byCode:new Map(),cache:new Map(),selected:null};
  let resolveReady;
  window.__hskDynamicReadyPromise=new Promise(r=>resolveReady=r);

  async function fetchJSON(url,timeout=7000){
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),timeout);
    try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
    finally{clearTimeout(tm)}
  }

  function addFile(group,code,path,repo=REPO){
    if(group.files.some(x=>x.code===code))return;
    const meta={code,name:code+'.json',path,group:group.name,repo,url:repo===REPO?localURL(path):rawURL(path,repo),remoteUrl:rawURL(path,repo)};
    group.files.push(meta);group.codes.push(code);state.byCode.set(code,meta);
  }

  function groupsFromManifest(m){
    const gm=new Map();
    const add=(folder,codes)=>{if(!Array.isArray(codes))return;let g=gm.get(folder);if(!g){g={name:folder,path:'data/'+folder,kind:kind(folder),level:level(folder),files:[],codes:[]};gm.set(folder,g)}codes.map(String).forEach(c=>addFile(g,c,'data/'+folder+'/'+c+'.json'))};
    for(let n=1;n<=6;n++)add('HSK '+n,m?.['hsk'+n+'_codes']);
    add('Workbook HSK4a',m?.workbook4a_codes);add('Workbook HSK4b',m?.workbook4b_codes);
    return [...gm.values()];
  }

  function cacheCatalog(groups){
    try{
      localStorage.setItem(CATALOG_CACHE_KEY,JSON.stringify(groups.map(g=>({name:g.name,path:g.path,kind:g.kind,level:g.level,files:g.files.map(f=>({code:f.code,name:f.name,path:f.path,repo:f.repo}))}))));
    }catch(e){}
  }

  function groupsFromCachedCatalog(){
    try{
      const raw=localStorage.getItem(CATALOG_CACHE_KEY);
      if(!raw)return [];
      const saved=JSON.parse(raw);
      if(!Array.isArray(saved))return [];
      const groups=[];
      for(const sg of saved){
        if(!sg||!Array.isArray(sg.files))continue;
        const g={name:String(sg.name||''),path:String(sg.path||''),kind:sg.kind||kind(sg.name),level:sg.level??level(sg.name),files:[],codes:[]};
        sg.files.forEach(f=>addFile(g,String(f.code||''),String(f.path||('data/'+g.name+'/'+f.code+'.json')),String(f.repo||REPO)));
        if(g.files.length)groups.push(g);
      }
      return groups;
    }catch(e){return []}
  }

  async function discover(allowFastCache=true){
    if(allowFastCache){
      const cached=groupsFromCachedCatalog();
      if(cached.length){
        setTimeout(()=>{
          discover(false).then(fresh=>{
            if(!fresh?.groups?.length||fresh.source==='local-catalog-cache')return;
            const selectedName=state.selected?.name||null;
            state.groups=sortGroups(fresh.groups);
            state.source=fresh.source;
            state.loaded=true;
            installStubs();
            state.selected=selectedName?state.groups.find(g=>g.name===selectedName)||null:null;
            renderLevels();
            if(state.selected)renderPackages();
            document.dispatchEvent(new Event('hsk:data-ready'));
            document.dispatchEvent(new Event('hsk:dynamic-catalog-ready'));
          }).catch(err=>console.warn('Background package catalog refresh failed.',err));
        },0);
        return {groups:cached,source:'local-catalog-cache'};
      }
    }
    /*
      Dynamic catalog loading — prefer the repository tree or complete folder
      listings, but query those providers concurrently so one slow endpoint
      does not delay a healthy endpoint. CDN/manifest are concurrent fallbacks.
    */
    const wantedFolders=[...Array.from({length:6},(_,i)=>'HSK '+(i+1)),'Workbook HSK4a','Workbook HSK4b'];

    function buildGroupsFromPaths(paths,sourceRepo=REPO){
      const map=new Map();
      for(const rawPath of (paths||[])){
        const path=String(rawPath||'').replace(/^\/+/, '');
        if(!path || !/\.json$/i.test(path))continue;
        const parts=path.split('/');let folder='',file='';
        if(parts.length===3&&parts[0]==='data'){folder=parts[1];file=parts[2]}
        else if(parts.length===2&&parts[0]==='data'){
          file=parts[1];const match=file.match(/^(H([1-6])\d{4}[A-Za-z]?)\.json$/i);
          if(!match)continue;folder='HSK '+match[2];
        }else continue;
        if(!wantedFolders.includes(folder))continue;
        const base=file.replace(/\.json$/i,'');
        if(/^(manifest|reading-passages)$/i.test(base))continue;
        const lv=String(base).match(/^H([1-6])\d{4}[A-Za-z]?$/i);
        if(folder.startsWith('HSK ')&&(!lv||Number(lv[1])!==Number(folder.slice(4))))continue;
        let g=map.get(folder);
        if(!g){g={name:folder,path:'data/'+folder,kind:kind(folder),level:level(folder),files:[],codes:[]};map.set(folder,g)}
        addFile(g,base,path,sourceRepo);
      }
      return [...map.values()].filter(g=>g.files.length);
    }

    async function fromTree(repo=REPO){
      const endpoint='https://api.github.com/repos/'+repo+'/git/trees/'+encodeURIComponent(REF)+'?recursive=1';
      const payload=await fetchJSON(endpoint,6000);
      const paths=Array.isArray(payload?.tree)?payload.tree.filter(x=>x?.type==='blob'&&Number(x.size||0)>0).map(x=>x.path).filter(Boolean):[];
      const groups=buildGroupsFromPaths(paths,repo);
      if(!groups.length)throw new Error('GitHub Tree API returned no package files.');
      return {groups,source:'github-tree'};
    }
    async function fromContents(){
      const results=await Promise.all(wantedFolders.map(async folder=>{
        const url='https://api.github.com/repos/'+REPO+'/contents/data/'
          +folder.split('/').map(encodeURIComponent).join('/')
          +'?ref='+encodeURIComponent(REF);
        try{return {folder,items:await fetchJSON(url,6000)}}
        catch(error){return {folder,items:null,error}}
      }));
      if(!results.every(x=>Array.isArray(x.items)))throw new Error('GitHub Contents API did not return all package folders.');
      const groups=[];
      for(const {folder,items} of results){
        const g={name:folder,path:'data/'+folder,kind:kind(folder),level:level(folder),files:[],codes:[]};
        for(const item of items){
          const file=String(item?.name||'');
          if(item?.type!=='file'||!/\.json$/i.test(file))continue;
          const base=file.replace(/\.json$/i,'');
          if(/^(manifest|reading-passages)$/i.test(base))continue;
          addFile(g,base,String(item.path||('data/'+folder+'/'+file)));
        }
        if(g.files.length)groups.push(g);
      }
      if(!groups.length)throw new Error('GitHub Contents API returned no package files.');
      return {groups,source:'github-folder-contents'};
    }
    async function fromJsDelivr(){
      const url='https://data.jsdelivr.com/v1/package/gh/'+REPO+'@'+encodeURIComponent(REF)+'/flat';
      const payload=await fetchJSON(url,6000);
      const paths=Array.isArray(payload?.files)?payload.files.map(x=>typeof x==='string'?x:x?.name).filter(Boolean):[];
      const groups=buildGroupsFromPaths(paths);
      if(!groups.length)throw new Error('jsDelivr index returned no package files.');
      return {groups,source:'github-files-jsdelivr'};
    }
    async function fromManifest(){
      const m=await fetchJSON(RAW_BASE+'data/manifest.json',4000);
      const groups=groupsFromManifest(m);
      if(!groups.length)throw new Error('Manifest returned no package files.');
      return {groups,source:'manifest-fallback'};
    }

    let result;
    try{
      result=await Promise.any([fromTree(),fromContents()]);
    }catch(primaryError){
      try{
        result=await Promise.any([fromJsDelivr(),fromManifest()]);
      }catch(fallbackError){
        const cached=groupsFromCachedCatalog();
        if(cached.length)return {groups:cached,source:'local-catalog-cache'};
        throw new Error('Katalog package tidak dapat dimuat dari repository.');
      }
    }
    const groups=sortGroups(result.groups);
    state.byCode.clear();for(const g of groups)for(const f of g.files)state.byCode.set(f.code,f);
    cacheCatalog(groups);
    return {groups,source:result.source};
  }

  function sortGroups(groups){
    groups.forEach(g=>{g.files.sort((a,b)=>natural(a.name,b.name));g.codes=g.files.map(f=>f.code)});
    groups.sort((a,b)=>{const ak=a.kind==='hsk'?0:a.kind==='workbook'?1:2,bk=b.kind==='hsk'?0:b.kind==='workbook'?1:2;if(ak!==bk)return ak-bk;if(a.level!=null&&b.level!=null&&a.level!==b.level)return a.level-b.level;if(a.level!=null&&b.level==null)return -1;if(a.level==null&&b.level!=null)return 1;return natural(a.name,b.name)});
    return groups;
  }

  function installStubs(){
    for(const g of state.groups)for(const meta of g.files){
      const old=DB[meta.code];
      if(old&&!old.__lazy){old.__folder=g.name;continue}
      DB[meta.code]={code:meta.code,__lazy:true,__folder:g.name,__dataPath:meta.path};
    }
    const find=n=>state.groups.find(g=>g.name.toLowerCase()===n.toLowerCase());
    window.__hskManifest=window.__hskManifest||{};
    window.__hskCatalog={
      groups:state.groups,
      hsk4:(find('HSK 4')||{}).codes||[],
      hsk5:(find('HSK 5')||{}).codes||[],
      wb4a:(find('Workbook HSK4a')||{}).codes||[],
      wb4b:(find('Workbook HSK4b')||{}).codes||[]
    };
    window.__HSK_DYNAMIC_GROUPS=state.groups;
  }

  function selectedGroup(){return state.selected||state.groups[0]||null}
  function renderLevels(){
    const grid=document.querySelector('#levelsScreen .levelGrid');if(!grid)return;
    const h=state.groups.filter(g=>g.kind==='hsk'),w=state.groups.filter(g=>g.kind==='workbook'),c=state.groups.filter(g=>g.kind==='custom');
    const sec=(label,arr)=>arr.length?'<div class="levelGroupDivider">'+esc(label)+'</div>'+arr.map(g=>{const i=state.groups.indexOf(g),icon=g.level!=null?g.level:(g.kind==='workbook'?'WB':'•'),noun=g.kind==='workbook'?'lesson':'paket';return '<button class="levelCard '+(g.kind==='workbook'?'levelCardWorkbook':(g.kind==='hsk'&&g.level===5?'levelCard5':'levelCard4'))+'" type="button" onclick="openDynamicFolder('+i+')"><div class="levelCardIcon">'+esc(icon)+'</div><div class="levelCardBody"><span class="levelEyebrow">'+esc(g.kind==='hsk'?'HSK LEVEL':g.kind==='workbook'?'WORKBOOK':'MATERI')+'</span><strong>'+esc(g.name)+'</strong><p>'+g.codes.length+' '+noun+' tersedia</p></div><span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span></button>'}).join(''):'';
    grid.innerHTML=sec('HSK',h)+sec('Workbook',w)+sec('Paket',c)||'<div class="notice"><strong>Belum ada paket.</strong><br>Database tidak berisi package.</div>';
  }

  function renderPackages(){
    const g=selectedGroup(),grid=$('packagesGrid');if(!g||!grid)return;
    const head=$('packageLevelKicker'),title=$('packagePageTitle'),sub=$('packagePageSub');
    if(head)head.textContent=g.name;
    if(title)title.textContent=g.kind==='workbook'?'Pilih lesson':'Pilih paket';
    if(sub)sub.textContent=g.codes.length+' '+(g.kind==='workbook'?'lesson':'paket')+' tersedia';
    const q=String($('packageSearchInput')?.value||'').trim().toLowerCase();
    const codes=g.codes.filter(c=>!q||c.toLowerCase().includes(q));
     const progressStore=readStore();
    document.querySelectorAll('.packagePager').forEach(x=>x.remove());

    grid.className='grid packageGridV16';
    if(!codes.length){
      grid.innerHTML='<div class="emptySearch"><strong>Paket tidak ditemukan</strong><span>Coba kata kunci lain.</span></div>';
      return;
    }

    grid.innerHTML=codes.map((c,i)=>{
      const st=typeof packageStats==='function'?packageStats(c,progressStore):{pct:0,answered:0,total:0};
      const pct=Math.max(0,Math.min(100,Number(st.pct)||0));
      const status=pct>=100?'Selesai':pct>0?'Sedang berjalan':'Belum dimulai';
      const accent=['#ff6548','#765fc7','#2aa876','#e15b64','#e6a21a'][i%5];
      return `<article class="packageCardV16" style="--package-accent:${accent}">
        <button class="packageCardV16Main" type="button" data-package-code="${esc(c)}" onclick="openPackage('${esc(c)}')" aria-label="Buka Paket ${esc(c)}">
          <span class="packageCardV16Accent" aria-hidden="true"></span>
          <span class="packageCardV16Hanzi" aria-hidden="true">卷</span>
          <span class="packageCardV16Info">
            <strong>Paket ${esc(c)}</strong>
            <small>${esc(g.name)}</small>
          </span>
          <span class="packageCardV16Status"><i></i>${status}</span>
          <span class="packageCardV16Arrow material-symbols-rounded" aria-hidden="true">arrow_forward</span>
          <span class="packageCardV16ProgressLabel">Progres paket</span>
          <span class="packageCardV16ProgressValue">${st.total?`${st.answered||0}/${st.total} · ${pct}%`:`${pct}%`}</span>
          <span class="packageCardV16Progress" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </button>
      </article>`;
    }).join('');
  }

  const PACKAGE_CACHE_NAME='hsk-papers-package-cache-v3';
  const PACKAGE_CACHE_TTL=30*24*60*60*1000;
  const packageRefresh=new Map();

  async function readCachedPackage(code){
    try{
      if(!('caches' in window))return null;
      const cache=await caches.open(PACKAGE_CACHE_NAME);
      const req=new Request('./'+encodeURIComponent(String(code))+'.json');
      const hit=await cache.match(req);
      if(!hit)return null;
      const stamp=Number(hit.headers.get('x-hsk-cached-at')||0);
      const data=await hit.clone().json();
      if(!data||typeof data!=='object')return null;
      return {data,stamp,stale:!!(stamp&&Date.now()-stamp>PACKAGE_CACHE_TTL)};
    }catch(e){return null}
  }

  async function writeCachedPackage(code,data){
    try{
      if(!('caches' in window))return;
      const cache=await caches.open(PACKAGE_CACHE_NAME);
      const req=new Request('./'+encodeURIComponent(String(code))+'.json');
      const body=JSON.stringify(data);
      const headers=new Headers({'Content-Type':'application/json','x-hsk-cached-at':String(Date.now())});
      await cache.put(req,new Response(body,{headers}));
    }catch(e){}
  }

  async function fetchPackageNetwork(meta,code){
    let lastError=null;
    for(const url of [meta.url,meta.remoteUrl||rawURL(meta.path)]){
      try{
        const timeout=url===meta.url?4500:6500;
        const d=await fetchJSON(url,timeout);
        if(!d||typeof d!=='object')throw new Error('JSON package tidak valid: '+code);
        return d;
      }catch(e){lastError=e}
    }
    throw lastError||new Error('Paket gagal dimuat: '+code);
  }

  function refreshPackageInBackground(meta,code){
    if(packageRefresh.has(code))return packageRefresh.get(code);
    const p=fetchPackageNetwork(meta,code).then(async d=>{
      d.code=d.code||code;
      d.__folder=meta.group||meta.path.split('/')[1]||'';
      d.__lazy=false;
      DB[code]=d;
      await writeCachedPackage(code,d);
      return d;
    }).catch(()=>null).finally(()=>packageRefresh.delete(code));
    packageRefresh.set(code,p);
    return p;
  }

  async function loadPackage(code){
    code=String(code||'');
    const meta=state.byCode.get(code);if(!meta)throw new Error('Paket tidak ditemukan di database: '+code);
    if(DB[code]&&!DB[code].__lazy)return DB[code];
    if(state.cache.has(code))return state.cache.get(code);

    const p=(async()=>{
      const cached=await readCachedPackage(code);
      if(cached){
        const data=cached.data;
        data.code=data.code||code;
        data.__folder=meta.group||meta.path.split('/')[1]||'';
        data.__lazy=false;
        DB[code]=data;
        refreshPackageInBackground(meta,code);
        return data;
      }

      try{
        const data=await fetchPackageNetwork(meta,code);
        data.code=data.code||code;
        data.__folder=meta.group||meta.path.split('/')[1]||'';
        data.__lazy=false;
        DB[code]=data;
        await writeCachedPackage(code,data);
        return data;
      }catch(networkError){
        const fallback=await readCachedPackage(code);
        if(!fallback)throw networkError;
        const data=fallback.data;
        data.code=data.code||code;
        data.__folder=meta.group||meta.path.split('/')[1]||'';
        data.__lazy=false;
        DB[code]=data;
        return data;
      }
    })().catch(e=>{state.cache.delete(code);throw e});

    state.cache.set(code,p);
    return p;
  }

  window.__hskLoadPackage=loadPackage;
  window.openDynamicFolder=function(i,push=true){
    const g=state.groups[Number(i)];
    if(!g)return;
    state.selected=g;
    window.__dbPackagePage=0;
    const materialKey=g.kind==='hsk'?'hsk:'+g.level:(g.kind==='workbook'?'wb:'+g.name:'custom:'+g.name);
    selectedHSKLevel=materialKey;
    route={screen:'packages',packageCode:null,type:null,sectionIndex:null,studyPlanId:null,materialKey};
    renderPackages();
    setScreen('packagesScreen',push);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };
  window.openPackages=function(push=true){route={screen:'levels',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};renderLevels();setScreen('levelsScreen',push);window.scrollTo({top:0,left:0,behavior:'auto'})};
  window.openLevelPackages=async function(key,push=true){
    const raw=String(key??'').trim();
    const value=/^hsk:\d+$/i.test(raw)?raw.toLowerCase():(/^wb:/i.test(raw)?raw:('hsk:'+raw));
    const cards=Array.from(document.querySelectorAll('#levelsScreen .levelCard'));
    const card=cards.find(el=>{
      const mk=String(el.getAttribute('data-material-key')||'').toLowerCase();
      const text=el.querySelector('.levelCardBody strong')?.textContent?.trim()||'';
      return mk===value || mk===('hsk:'+raw).toLowerCase() || text.toLowerCase()===raw.toLowerCase() || text.toLowerCase()===('hsk '+raw).toLowerCase();
    });
    const arrow=card?.querySelector('.levelCardArrow');
    if(arrow)arrow.classList.add('is-loading');
    try{
      if(!state.loaded)await window.__hskDynamicReadyPromise;
      if(state.error)throw state.error;
      let g=state.groups.find(x=>x.kind==='hsk'&&('hsk:'+x.level).toLowerCase()===value);
      if(!g && /^wb:/i.test(value))g=state.groups.find(x=>x.kind==='workbook'&&('wb:'+x.name).toLowerCase()===value.toLowerCase());
      if(!g)throw new Error('Materi tidak tersedia di katalog.');
      window.openDynamicFolder(state.groups.indexOf(g),push);
    }catch(e){
      console.error('openLevelPackages failed',e);
      if(typeof window.appNotice==='function')window.appNotice('Katalog gagal dimuat',e.message||'Silakan coba lagi.',{icon:'!'});
    }finally{
      arrow?.classList.remove('is-loading');
    }
  };
  window.renderLevelsScreen=renderLevels;window.renderPackagesScreen=renderPackages;window.filterPackages=v=>{const i=$('packageSearchInput');if(i)i.value=String(v??'');window.__dbPackagePage=0;renderPackages()};window.clearPackageSearch=()=>{const i=$('packageSearchInput');if(i)i.value='';window.__dbPackagePage=0;renderPackages();i?.focus()};
  window.openPackage=async function(code,push=true){
    const target=String(code||'');
    const btn=document.querySelector(`#packagesScreen #packagesGrid [data-package-code=\"${CSS.escape(target)}\"]`);
    const arrow=btn?.querySelector('.packageCardV16Arrow');
    if(arrow)arrow.classList.add('is-loading');
    try{
      const keep=window.__functionalRepairV4?.returnPlanId||route?.studyPlanId||null;
      window.__functionalRepairV4&&(window.__functionalRepairV4.returnPlanId=null);
      await loadPackage(target);
      route={screen:'package',packageCode:target,type:null,sectionIndex:null,studyPlanId:keep};
      if(typeof renderPackage==='function')renderPackage();
      setScreen('package',push);
      window.scrollTo({top:0,left:0,behavior:'auto'});
    }catch(e){
      console.error('openPackage failed',e);
      if(typeof window.appNotice==='function')window.appNotice('Paket gagal dimuat',e.message||'Silakan coba lagi.',{icon:'!'});
    }finally{
      arrow?.classList.remove('is-loading');
    }
  };
  window.openPackageFromTile=window.openPackage;
  window.openSections=async function(code,type,push=true){
    try{
      if(type==='reading'&&typeof window.__hskEnsureReadingPassages==='function')await window.__hskEnsureReadingPassages();
      await loadPackage(code);
      if(!META[type])return;
      route={screen:'parts',packageCode:String(code),type,sectionIndex:null,studyPlanId:route?.studyPlanId||null};
      if(typeof renderSections==='function')renderSections();
      setScreen('partsScreen',push);
    }catch(e){
      console.error('openSections failed',e);
      if(typeof window.appNotice==='function')window.appNotice('Bagian gagal dimuat',e.message||'Silakan coba lagi.',{icon:'!'});
    }
  };
  window.startSection=async function(i,push=true){
    const code=String(route?.packageCode||''),type=route?.type;
    if(!code||!META[type])return;
    try{
      if(type==='reading'&&typeof window.__hskEnsureReadingPassages==='function')await window.__hskEnsureReadingPassages();
      await loadPackage(code);
      const arr=DB[code]?.[type]||[];
      if(!arr[i])return;
      route={screen:'exercise',packageCode:code,type,sectionIndex:Number(i),studyPlanId:route?.studyPlanId||null};
      resumeQuestionId=null;window.__hskResumePage=0;loadCurrentSectionState();renderExercise();setScreen('exercise',push);
    }catch(e){
      console.error('startSection failed',e);
      if(typeof window.appNotice==='function')window.appNotice('Soal gagal dimuat',e.message||'Silakan coba lagi.',{icon:'!'});
    }
  };
  window.restore=async function(st){if(st?.packageCode&&state.byCode.has(String(st.packageCode))){try{await loadPackage(String(st.packageCode))}catch(e){console.error(e);return}}};

  async function boot(){
    try{
      const r=await discover();state.groups=sortGroups(r.groups);state.source=r.source;state.loaded=true;state.selected=null;installStubs();resolveReady(state);renderLevels();document.dispatchEvent(new Event('hsk:data-ready'));document.dispatchEvent(new Event('hsk:dynamic-catalog-ready'));console.info('HSK database ready:',state.source,state.groups.map(g=>g.name+':'+g.codes.length).join(', '));
    }catch(e){state.loaded=true;state.error=e;resolveReady(state);console.error('HSK database unavailable:',e);const grid=document.querySelector('#levelsScreen .levelGrid');if(grid)grid.innerHTML='<div class="notice"><strong>Database tidak dapat dimuat.</strong><br>'+esc(e.message||'Periksa koneksi internet.')+'</div>'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
