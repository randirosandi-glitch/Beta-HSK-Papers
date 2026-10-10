/* Source module: navigation controller.
 * Exact extraction from the prior inline script block.
 * Preserve execution order and legacy globals during this rebuild.
 */

(function(){
  'use strict';
  /*
   * HARDWARE BACK IS INTENTIONALLY BLOCKED.
   *
   * Product rule:
   *   - Hardware/browser Back NEVER changes the app screen.
   *   - The user must use the app's visible Back button.
   *   - Hardware Back only shows a 1-second toast.
   *   - App Back changes the app route without asking Chrome to navigate.
   *
   * This controller deliberately does NOT use popstate to navigate the app.
   * The browser history is only used as a sacrificial guard entry so that
   * Android/Chrome cannot escape the app when hardware Back is pressed.
   */
  if(window.__hskNavigationControllerV10)return;
  window.__hskNavigationControllerV10=true;
  window.__hskNavigationController=true;

  const APP='__hskAppV10';
  let internalChange=false;
  let initialized=false;

  function norm(s){return {
    screen:String(s?.screen||'home'),
    packageCode:s?.packageCode??null,
    type:s?.type??null,
    sectionIndex:s?.sectionIndex??null,
    studyPlanId:s?.studyPlanId??null
  };}
  function snap(){return norm(window.route||{});}
  function same(a,b){a=norm(a);b=norm(b);return a.screen===b.screen &&
    String(a.packageCode??'')===String(b.packageCode??'') &&
    String(a.type??'')===String(b.type??'') &&
    String(a.sectionIndex??'')===String(b.sectionIndex??'') &&
    String(a.studyPlanId??'')===String(b.studyPlanId??'');}
  function home(){return {screen:'home',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};}
  function stateFor(r){return {...norm(r),[APP]:true};}
  async function ensurePackageForRoute(r){
    r=norm(r);
    if(!r.packageCode)return true;
    const code=String(r.packageCode);
    /* Preserve lazy loading: fetch only when the route actually needs the package. */
    if(DB?.[code] && !DB[code].__lazy)return true;
    if(typeof window.__hskLoadPackage!=='function'){
      throw new Error('Loader paket belum siap: '+code);
    }
    await window.__hskLoadPackage(code);
    return !!(DB?.[code] && !DB[code].__lazy);
  }

  async function render(r){
    r=norm(r); window.route=r;
    try{
      await ensurePackageForRoute(r);
      if(r.screen==='home'){if(typeof renderHome==='function')renderHome();setScreen('home',false);return true;}
      if(r.screen==='levels'){if(typeof renderLevelsScreen==='function')renderLevelsScreen();setScreen('levelsScreen',false);return true;}
      if(r.screen==='packages'){if(typeof renderPackagesScreen==='function')renderPackagesScreen();setScreen('packagesScreen',false);return true;}
      if(r.screen==='scores'){if(typeof renderScoresMaster==='function')renderScoresMaster();setScreen('scores',false);return true;}
      if(r.screen==='studyPlans'){if(typeof renderStudyPlans==='function')renderStudyPlans();setScreen('studyPlans',false);return true;}
      if(r.screen==='studyPlanDetail'){if(typeof renderStudyPlanDetail==='function')renderStudyPlanDetail();else if(typeof renderPlanDetailV4==='function')renderPlanDetailV4();setScreen('studyPlanDetail',false);return true;}
      if(r.screen==='package'){if(typeof renderPackage==='function')renderPackage();setScreen('package',false);return true;}
      if(r.screen==='parts'){if(typeof renderSections==='function')renderSections();setScreen('partsScreen',false);return true;}
      if(r.screen==='exercise'){if(typeof loadCurrentSectionState==='function')loadCurrentSectionState();if(typeof renderExercise==='function')renderExercise();setScreen('exercise',false);return true;}
      if(r.screen==='result'){r.screen='exercise';window.route=r;if(typeof loadCurrentSectionState==='function')loadCurrentSectionState();if(typeof renderExercise==='function')renderExercise();setScreen('exercise',false);return true;}
    }catch(e){
      console.error('HSK router render error',e);
      if(r.screen==='exercise'&&typeof showExerciseLoadRecovery==='function'){
        setScreen('exercise',false);
        showExerciseLoadRecovery('Soal belum berhasil dimuat','Data paket belum siap. Coba lagi untuk memuat paket secara lazy.');
      }
    }
    return false;
  }
  function parentOf(r){
    r=norm(r);
    switch(r.screen){
      case 'studyPlanDetail': return {screen:'studyPlans',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};
      case 'package': return r.studyPlanId?{screen:'studyPlanDetail',packageCode:null,type:null,sectionIndex:null,studyPlanId:r.studyPlanId}:{screen:'packages',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};
      case 'parts': return {screen:'package',packageCode:r.packageCode,type:null,sectionIndex:null,studyPlanId:r.studyPlanId};
      case 'exercise': return {screen:'parts',packageCode:r.packageCode,type:r.type,sectionIndex:null,studyPlanId:r.studyPlanId};
      case 'result': return {screen:'exercise',packageCode:r.packageCode,type:r.type,sectionIndex:r.sectionIndex,studyPlanId:r.studyPlanId};
      case 'packages': return {screen:'levels',packageCode:null,type:null,sectionIndex:null,studyPlanId:null};
      case 'levels': case 'scores': case 'studyPlans': return home();
      default:return home();
    }
  }
  function toast(){
    let el=document.getElementById('hskHardwareBackToast');
    if(!el){
      el=document.createElement('div');el.id='hskHardwareBackToast';el.textContent='Gunakan tombol kembali di app';
      el.setAttribute('role','status');el.setAttribute('aria-live','polite');
      el.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) translateY(8px);z-index:2147483647;padding:10px 16px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(24,28,40,.96);color:#f5f7fb;font:600 14px/1.25 Roboto,system-ui,sans-serif;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .14s ease,transform .14s ease;';
      document.body.appendChild(el);
    }
    el.style.opacity='1';el.style.transform='translate(-50%,-50%) translateY(0)';
    clearTimeout(el.__hideTimer);el.__hideTimer=setTimeout(()=>{el.style.opacity='0';el.style.transform='translate(-50%,-50%) translateY(8px)';},1000);
  }

  /* Every forward navigation gets a fresh browser entry. */
  const originalSetScreen=window.setScreen;
  if(typeof originalSetScreen==='function'&&!originalSetScreen.__hskSingleRouterV10){
    function routerSetScreen(name,push=true){
      const out=originalSetScreen.call(this,name,false);
      if(push!==false && !internalChange){
        const r=snap();
        history.pushState(stateFor(r),'',location.href.split('#')[0]+'#'+encodeURIComponent(r.screen));
      }
      return out;
    }
    routerSetScreen.__hskSingleRouterV10=true;
    routerSetScreen.__hskOriginal=originalSetScreen;
    window.setScreen=routerSetScreen;
    try{setScreen=routerSetScreen}catch(_){ }
  }

  /* Visible app Back: use the ACTUAL visible app layer, not browser history.
     Some legacy feature functions can leave window.route stale while the
     correct .screen is visibly active. Reading the active screen first keeps
     the app Back button deterministic and prevents false Exit dialogs. */
  function visibleRoute(){
    const active=document.querySelector('.screen.active');
    const id=active?.id||'';
    const r=snap();
    const out=norm(r);
    const map={
      home:'home',
      levelsScreen:'levels',
      packagesScreen:'packages',
      scores:'scores',
      studyPlans:'studyPlans',
      studyPlanDetail:'studyPlanDetail',
      package:'package',
      partsScreen:'parts',
      exercise:'exercise',
      result:'result'
    };
    if(map[id])out.screen=map[id];
    return out;
  }

  /* Keep the navigation chrome tied to the screen that is actually visible.
     Some legacy renderers can update DOM before/without leaving route in the
     exact shape expected by older chrome code. Back must never expose a stale
     Back button or highlight the wrong navbar tab. */
  function syncChrome(){
    const active=document.querySelector('.screen.active');
    const id=active?.id||'';
    const map={
      home:'home',
      levelsScreen:'levels',
      packagesScreen:'packages',
      scores:'scores',
      studyPlans:'studyPlans',
      studyPlanDetail:'studyPlanDetail',
      package:'package',
      partsScreen:'parts',
      exercise:'exercise',
      result:'result'
    };
    const screen=map[id]||norm(window.route||{}).screen;
    const backHidden=screen==='home'||screen==='levels'||screen==='studyPlans';
    const tb=document.getElementById('topBack');
    if(tb)tb.style.setProperty('display',backHidden?'none':'inline-flex','important');
    document.querySelectorAll('.mainNav .navItem').forEach(b=>{
      const activeNav=(screen===b.dataset.nav)||
        ((screen==='studyPlans'||screen==='studyPlanDetail')&&b.dataset.nav==='studyPlans')||
        ((screen==='levels'||screen==='packages'||screen==='package'||screen==='parts'||screen==='exercise'||screen==='result')&&b.dataset.nav==='packages');
      b.classList.toggle('active',activeNav);
    });
  }
  async function back(){
    if(internalChange)return;
    const r=visibleRoute();
    /* Only the real Home screen may open the Exit confirmation. */
    if(r.screen==='home'){
      try{if(typeof window.showExit==='function')window.showExit(true);else if(typeof showExit==='function')showExit(true);}catch(e){}
      return;
    }
    const p=parentOf(r);
    /* When leaving a package, restore the package-list material from the
       package being viewed.  The package list is filtered by the global
       selectedHSKLevel state, so relying on its previous value can send an
       HSK 5 package back to the HSK 4 list. */
    if(p.screen==='packages' && r.packageCode){
      const code=String(r.packageCode);
      if(typeof regularLevel==='function'){
        const level=regularLevel(code);
        if(level!==null){
          selectedHSKLevel='hsk:'+level;
          window.__masterPackagePage=0;
          window.__wbPackagePage=0;
        }else if(typeof workbookFamily==='function'){
          const wb=workbookFamily(code);
          if(wb){
            selectedHSKLevel='wb:'+wb.key;
            window.__masterPackagePage=0;
            window.__wbPackagePage=0;
          }
        }
      }
    }
    internalChange=true;
    try{
      window.route=norm(p);
      /* Keep the Study Plan detail identifier used by the legacy renderer. */
      if(p.screen==='studyPlanDetail' && typeof studyPlanDetailId!=='undefined' && studyPlanDetailId==null){
        const candidate=r.studyPlanId;
        if(candidate!=null)studyPlanDetailId=candidate;
      }
      /* Back uses the same lazy-load gate as forward navigation. */
      await render(p);
      syncChrome();
    }catch(e){
      console.error('HSK app Back error',e);
      syncChrome();
    }finally{internalChange=false;}
  }
  window.backRoute=back;window.handleAppBack=back;window.__directLayerBack=back;

  /* Hardware/browser Back: always cancel the browser move and stay exactly
     where the user is. No route is rendered here. */
  window.addEventListener('popstate',function(e){
    if(internalChange)return;
    toast();
    setTimeout(function(){
      try{history.forward();}catch(_){
        try{history.pushState(stateFor(snap()),'',location.href);}catch(__){}
      }
    },0);
  },true);

  /* Close/Cancel of the exit dialog never invokes browser Back. */
  window.cancelExit=function(){
    const m=document.getElementById('exitModal');if(m)m.classList.remove('show');
    if(typeof exitFromBack!=='undefined')exitFromBack=false;
  };

  function initialize(){
    if(initialized)return;
    if(!window.currentUsername&&typeof currentUsername!=='undefined'&&!currentUsername)return;
    initialized=true;
    const r=snap();
    internalChange=true;
    try{
      /* Collapse whatever old router left behind. The current visible route
         becomes the sole logical app state, followed by one guard entry. */
      history.replaceState(stateFor(r),'',location.href.split('#')[0]+'#'+encodeURIComponent(r.screen));
      history.pushState(stateFor(r),'',location.href.split('#')[0]+'#'+encodeURIComponent(r.screen));
      render(r);
      syncChrome();
    }finally{internalChange=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
