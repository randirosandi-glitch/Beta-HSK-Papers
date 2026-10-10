/* Source module: progress reset controls.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';

  function resetPackageProgress(code){
    code=String(code||'');
    if(!code||!DB[code])return;
    const st=packageStats(code);
    if(!st.answered){
      appNotice('Belum ada progres','Paket ini belum memiliki progres yang tersimpan.');
      return;
    }
    const title=DB[code]?.title||('Paket '+code);
    appConfirm('Reset progres '+title+'?','Semua jawaban yang tersimpan dalam paket ini akan dihapus. Progres paket akan kembali ke 0%. Tindakan ini tidak dapat dibatalkan.',()=>{
    const store=readStore();
    const prefix=code+'|';
    const resetAt=Date.now();
    Object.keys(store).forEach(k=>{if(k.startsWith(prefix))delete store[k]});
    if(store._resume?.code===code)delete store._resume;
    store._progressResets={...(store._progressResets||{}),['package:'+code]:resetAt,_resume:resetAt};
    writeStore(store);
    if(route?.packageCode===code){
      answers={};
      checked={};
      resultState=null;
      resumeQuestionId=null;
      window.__hskResumePage=0;
    }
    if(currentUsername&&cloudEnabled())pushCloudState(readStore());
    if(route?.screen==='package')renderPackage();
    else if(route?.screen==='parts')renderSections();
    else if(typeof window.renderPackagesScreen==='function')window.renderPackagesScreen();
    },{icon:'↻',okText:'Reset',danger:true});
  }

  function resetSectionProgress(code,type){
    code=String(code||'');
    type=String(type||'');
    if(!code||!META[type]||!DB[code]?.[type])return;
    const arr=DB[code][type]||[];
    let answered=0;
    for(let i=0;i<arr.length;i++)answered+=sectionStats(code,type,i).answered;
    if(!answered){
      appNotice('Belum ada progres','Bagian '+(META[type]?.label||type)+' belum memiliki progres yang tersimpan.');
      return;
    }
    const label=META[type]?.label||type;
    appConfirm('Reset progres '+label+'?','Semua jawaban yang tersimpan pada '+label+' di paket ini akan dihapus. Progres '+label+' akan kembali ke 0%. Tindakan ini tidak dapat dibatalkan.',()=>{
    const store=readStore();
    const prefix=code+'|'+type+'|';
    const resetAt=Date.now();
    Object.keys(store).forEach(k=>{if(k.startsWith(prefix))delete store[k]});
    if(store._resume&&store._resume.code===code&&store._resume.type===type)delete store._resume;
    store._progressResets={...(store._progressResets||{}),['section:'+code+'|'+type]:resetAt,_resume:resetAt};
    writeStore(store);
    if(route?.packageCode===code&&route?.type===type){
      answers={};
      checked={};
      resultState=null;
      resumeQuestionId=null;
      window.__hskResumePage=0;
    }
    if(currentUsername&&cloudEnabled())pushCloudState(readStore());
    if(route?.screen==='parts')renderSections();
    else if(route?.screen==='exercise')renderExercise();
    },{icon:'↻',okText:'Reset',danger:true});
  }

  function appendPackageReset(){
    const host=document.querySelector('#parts');
    if(!host||host.querySelector('.packageResetControl'))return;
    const area=document.createElement('div');
    area.className='progressResetArea packageResetControl';
    const btn=document.createElement('button');
    btn.className='progressResetBtn';
    btn.type='button';
    btn.innerHTML='<span class="resetIcon" aria-hidden="true">↻</span> Reset progres paket';
    btn.onclick=()=>resetPackageProgress(route.packageCode);
    area.appendChild(btn);
    host.appendChild(area);
  }

  function appendSectionReset(){
    const host=document.querySelector('#sections');
    if(!host||host.querySelector('.sectionResetControl'))return;
    if(!route?.packageCode||!route?.type)return;
    const d=DB[route.packageCode]?.[route.type]||[];
    const available=d.map((s,i)=>({s,i})).filter(x=>Array.isArray(x.s.questions)&&x.s.questions.length>0);
    if(!available.length)return;
    const area=document.createElement('div');
    area.className='progressResetArea sectionResetControl';
    const btn=document.createElement('button');
    btn.className='progressResetBtn';
    btn.type='button';
    btn.innerHTML='<span class="resetIcon" aria-hidden="true">↻</span> Reset progres '+String(META[route.type]?.label||route.type);
    btn.onclick=()=>resetSectionProgress(route.packageCode,route.type);
    area.appendChild(btn);
    host.appendChild(area);
  }

  window.resetPackageProgress=resetPackageProgress;
  window.resetSectionProgress=resetSectionProgress;

  const originalPackage=window.renderPackage;
  if(typeof originalPackage==='function'){
    window.renderPackage=function(){
      originalPackage.apply(this,arguments);
      requestAnimationFrame(appendPackageReset);
    };
  }

  const originalSections=window.renderSections;
  if(typeof originalSections==='function'){
    window.renderSections=function(){
      originalSections.apply(this,arguments);
      requestAnimationFrame(appendSectionReset);
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
      if(route?.screen==='package')appendPackageReset();
      if(route?.screen==='parts')appendSectionReset();
    });
  }else{
    if(route?.screen==='package')appendPackageReset();
    if(route?.screen==='parts')appendSectionReset();
  }
})();
