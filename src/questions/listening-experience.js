/* Source module: combined Listening exercise and Drive audio player.
 * Keep legacy section keys as the persistence boundary while presenting one
 * continuous Listening exercise to the learner.
 */
(function(){
  'use strict';

  const DRIVE_INDEX_URL='https://script.google.com/macros/s/AKfycbwzuV2f58gr1J6-oL2lKsOmYmCQWov8MGTJGhPVRcxBECvpjVaW39dGdBtng0t3f3goWQ/exec';
  const original={
    openSections:window.openSections,
    startSection:window.startSection,
    renderExercise:window.renderExercise,
    setScreen:window.setScreen,
    getSectionState:window.getSectionState,
    sectionStats:window.sectionStats,
    saveSectionState:window.saveSectionState,
    clearSectionState:window.clearSectionState,
    checkOne:window.checkOne,
    choose:window.choose,
    repeatOne:window.repeatOne
  };
  let audioIndex=null;
  let audioIndexPromise=null;
  let dock=null;
  let audio=null;
  let audioStatus=null;
  let retryButton=null;
  let activeAudioCode='';
  let activeAudioUrl='';
  let sourceMapCode='';
  let sourceByQuestion=new Map();

  function listeningParts(code){
    const sections=DB[String(code||'')]?.listening;
    if(!Array.isArray(sections))return [];
    return sections.map(function(section,index){
      const questions=Array.isArray(section?.questions)?section.questions:[];
      const ids=questions.map(function(q){return Number(q?.[0])}).filter(Number.isFinite);
      const range=String(section?.range|| (ids.length?Math.min.apply(null,ids)+'-'+Math.max.apply(null,ids):''));
      return {index:index,section:section,questions:questions,range:range};
    });
  }
  function rebuildSourceMap(code,parts){
    sourceMapCode=String(code||'');
    sourceByQuestion=new Map();
    parts.forEach(function(part){
      part.questions.forEach(function(q){sourceByQuestion.set(String(q?.[0]),part.index)});
    });
  }
  function sourceIndex(id,code){
    const wanted=String(code||route?.packageCode||'');
    if(wanted===sourceMapCode&&sourceByQuestion.has(String(id)))return sourceByQuestion.get(String(id));
    const parts=listeningParts(wanted);
    for(const part of parts){
      if(part.questions.some(function(q){return String(q?.[0])===String(id)}))return part.index;
    }
    return null;
  }
  window.__hskListeningSourceIndex=function(id,code){return sourceIndex(id,code)};
  function isCombined(code,type,index){
    return String(type)==='listening'&&Number(index)===-1&&!!DB[String(code||'')];
  }
  function mergedState(code,parts,storeArg){
    const merged={answers:{},checked:{},answerEvents:{}};
    const aggregate=original.getSectionState?.(code,'listening',-1,storeArg)||{};
    Object.assign(merged.answers,aggregate.answers||{});
    Object.assign(merged.checked,aggregate.checked||{});
    Object.assign(merged.answerEvents,aggregate.answerEvents||{});
    parts.forEach(function(part){
      const state=original.getSectionState?.(code,'listening',part.index,storeArg)||{};
      Object.assign(merged.answers,state.answers||{});
      Object.assign(merged.checked,state.checked||{});
      Object.assign(merged.answerEvents,state.answerEvents||{});
    });
    return merged;
  }
  if(typeof original.getSectionState==='function'){
    window.getSectionState=function(code,type,index,storeArg){
      if(isCombined(code,type,index))return mergedState(code,listeningParts(code),storeArg);
      return original.getSectionState.apply(this,arguments);
    };
  }
  if(typeof original.sectionStats==='function'){
    window.sectionStats=function(code,type,index,storeArg){
      if(!isCombined(code,type,index))return original.sectionStats.apply(this,arguments);
      return listeningParts(code).reduce(function(total,part){
        const current=original.sectionStats.call(this,code,'listening',part.index,storeArg)||{};
        total.answered+=Number(current.answered)||0;
        total.total+=Number(current.total)||0;
        total.score+=Number(current.score)||0;
        return total;
      }.bind(this),{answered:0,total:0,score:0,pct:0});
    };
    const sectionStatsCombined=window.sectionStats;
    window.sectionStats=function(code,type,index,storeArg){
      const result=sectionStatsCombined.apply(this,arguments);
      if(isCombined(code,type,index))result.pct=result.total?Math.round(result.answered/result.total*100):0;
      return result;
    };
  }
  if(typeof original.saveSectionState==='function'){
    window.saveSectionState=function(code,type,index,answersArg,checkedArg,eventsArg){
      if(!isCombined(code,type,index))return original.saveSectionState.apply(this,arguments);
      const parts=listeningParts(code);
      const buckets=new Map();
      parts.forEach(function(part){
        const saved=original.getSectionState?.(code,'listening',part.index)||{};
        buckets.set(part.index,{
          answers:Object.assign({},saved.answers||{}),
          checked:Object.assign({},saved.checked||{}),
          answerEvents:Object.assign({},saved.answerEvents||{})
        });
        part.questions.forEach(function(q){
          const id=String(q?.[0]),bucket=buckets.get(part.index);
          delete bucket.answers[id];delete bucket.checked[id];delete bucket.answerEvents[id];
        });
      });
      const inputAnswers=answersArg||answers||{};
      const inputChecked=checkedArg||checked||{};
      const inputEvents=eventsArg||answerEvents||{};
      for(const key of new Set(Object.keys(inputAnswers).concat(Object.keys(inputChecked),Object.keys(inputEvents)))){
        const indexForQuestion=sourceIndex(key,code);
        if(indexForQuestion===null||!buckets.has(indexForQuestion))continue;
        const bucket=buckets.get(indexForQuestion);
        if(Object.prototype.hasOwnProperty.call(inputAnswers,key))bucket.answers[key]=inputAnswers[key];
        if(Object.prototype.hasOwnProperty.call(inputChecked,key))bucket.checked[key]=inputChecked[key];
        if(Object.prototype.hasOwnProperty.call(inputEvents,key))bucket.answerEvents[key]=inputEvents[key];
      }
      let result;
      buckets.forEach(function(bucket,partIndex){
        result=original.saveSectionState.call(this,code,'listening',partIndex,bucket.answers,bucket.checked,bucket.answerEvents);
      },this);
      return result;
    };
  }
  if(typeof original.clearSectionState==='function'){
    window.clearSectionState=function(code,type,index){
      if(!isCombined(code,type,index))return original.clearSectionState.apply(this,arguments);
      listeningParts(code).forEach(function(part){original.clearSectionState.call(this,code,'listening',part.index)}.bind(this));
      return original.clearSectionState.call(this,code,'listening',-1);
    };
  }

  function withSourceSection(id,fn,args){
    if(route?.type!=='listening'||Number(route?.sectionIndex)!==-1)return fn.apply(this,args||[]);
    const index=sourceIndex(id);
    if(index===null)return fn.apply(this,args||[]);
    const prior=route.sectionIndex;
    route.sectionIndex=index;
    try{return fn.apply(this,args||[])}
    finally{route.sectionIndex=prior}
  }
  ['checkOne','choose','repeatOne'].forEach(function(name){
    const fn=original[name];
    if(typeof fn!=='function')return;
    window[name]=function(){
      const args=Array.from(arguments);
      let id=args[0];
      if(name==='choose')id=arguments[0]?.dataset?.q;
      const out=withSourceSection.call(this,id,fn,args);
      if(route?.type==='listening'&&Number(route?.sectionIndex)===-1&&name!=='repeatOne'&&typeof window.refreshCurrentProgress==='function'){
        window.refreshCurrentProgress();
      }
      return out;
    };
  });

  function ensureDock(){
    if(dock?.isConnected)return dock;
    const exercise=document.getElementById('exercise');
    const questions=document.getElementById('questions');
    if(!exercise||!questions)return null;
    dock=document.createElement('div');
    dock.id='listeningAudioDock';
    dock.className='listeningAudioDock';
    dock.setAttribute('aria-label','Pemutar audio Listening');
    audio=document.createElement('audio');
    audio.controls=true;
    audio.preload='none';
    audio.hidden=true;
    audio.setAttribute('aria-label','Audio Listening paket');
    audio.addEventListener('error',function(){
      if(activeAudioCode&&route?.type==='listening'){
        setAudioMessage('Audio tidak dapat dimuat dari Google Drive. Periksa izin file atau coba lagi.',true,true);
      }
    });
    audioStatus=document.createElement('div');
    audioStatus.className='listeningAudioStatus';
    audioStatus.setAttribute('role','status');
    audioStatus.setAttribute('aria-live','polite');
    retryButton=document.createElement('button');
    retryButton.type='button';
    retryButton.className='btn soft listeningAudioRetry';
    retryButton.textContent='Coba lagi';
    retryButton.hidden=true;
    retryButton.addEventListener('click',function(){window.__hskRetryListeningAudio?.()});
    dock.appendChild(audio);
    dock.appendChild(audioStatus);
    dock.appendChild(retryButton);
    exercise.insertBefore(dock,questions);
    return dock;
  }
  function setAudioMessage(message,showRetry,showPlayer){
    if(!ensureDock())return;
    audioStatus.textContent=String(message||'');
    retryButton.hidden=!showRetry;
    audio.hidden=!showPlayer;
  }
  function jsonp(url,timeout){
    return new Promise(function(resolve,reject){
      const callback='__hskBetaAudioIndex_'+Date.now()+'_'+Math.floor(Math.random()*1000000);
      const script=document.createElement('script');
      let complete=false;
      const clean=function(){
        if(complete)return;
        complete=true;
        clearTimeout(timer);
        try{delete window[callback]}catch(e){window[callback]=undefined}
        script.remove();
      };
      const timer=setTimeout(function(){clean();reject(new Error('Waktu tunggu indeks audio habis.'))},timeout||12000);
      window[callback]=function(data){clean();resolve(data)};
      script.onerror=function(){clean();reject(new Error('Indeks audio Google Drive tidak dapat dibaca.'))};
      script.src=url+(url.indexOf('?')>=0?'&':'?')+'callback='+encodeURIComponent(callback)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }
  function getAudioIndex(force){
    if(force){audioIndex=null;audioIndexPromise=null}
    if(audioIndex)return Promise.resolve(audioIndex);
    if(audioIndexPromise)return audioIndexPromise;
    audioIndexPromise=jsonp(DRIVE_INDEX_URL,12000).then(function(data){
      if(!data||typeof data!=='object'||!data.files||typeof data.files!=='object'){
        throw new Error(data?.error||'Format indeks audio Google Drive tidak dikenal.');
      }
      audioIndex=data;
      return data;
    }).catch(function(error){
      audioIndexPromise=null;
      throw error;
    });
    return audioIndexPromise;
  }
  function audioEntryFor(index,code){
    const files=index?.files||{};
    if(files[code])return files[code];
    const key=Object.keys(files).find(function(value){return value.toUpperCase()===String(code).toUpperCase()});
    return key?files[key]:null;
  }
  function validatedAudioUrl(entry){
    if(!entry)return {url:'',message:'Audio untuk paket ini belum terdaftar di Google Drive.'};
    const access=String(entry.sharingAccess||'');
    if(access!=='ANYONE_WITH_LINK'&&access!=='ANYONE'){
      return {url:'',message:'MP3 ditemukan, tetapi izinnya belum publik. Atur akses Drive ke “Siapa saja yang memiliki link”.'};
    }
    try{
      const url=new URL(String(entry.url||''));
      const fileId=url.searchParams.get('id');
      if(url.protocol!=='https:'||url.hostname!=='drive.google.com'||url.pathname!=='/uc'||!fileId){
        return {url:'',message:'Tautan MP3 di indeks tidak valid.'};
      }
      if(entry.id&&String(entry.id)!==fileId)return {url:'',message:'ID MP3 di indeks tidak cocok dengan tautannya.'};
      return {url:url.href,message:'Audio siap. Tekan Putar untuk mulai mendengarkan.'};
    }catch(e){
      return {url:'',message:'Tautan MP3 di indeks tidak valid.'};
    }
  }
  async function loadAudioForPackage(code,force){
    code=String(code||'');
    const host=ensureDock();
    if(!host)return;
    if(activeAudioCode&&activeAudioCode!==code){
      audio.pause();audio.removeAttribute('src');audio.load();activeAudioUrl='';
    }
    if(activeAudioUrl&&activeAudioCode===code&&!force){
      setAudioMessage('Audio siap. Tekan Putar untuk mulai mendengarkan.',false,true);
      return;
    }
    activeAudioCode=code;
    setAudioMessage('Memeriksa indeks audio…',false,false);
    try{
      const index=await getAudioIndex(!!force);
      if(route?.type!=='listening'||String(route?.packageCode||'')!==code)return;
      const state=validatedAudioUrl(audioEntryFor(index,code));
      if(!state.url){
        if(audio){audio.pause();audio.removeAttribute('src');audio.load();activeAudioUrl=''}
        setAudioMessage(state.message,true,false);
        return;
      }
      if(activeAudioUrl!==state.url){
        audio.pause();audio.removeAttribute('src');audio.load();
        audio.src=state.url;
        audio.preload='none';
        activeAudioUrl=state.url;
      }
      setAudioMessage(state.message,false,true);
    }catch(error){
      if(route?.type!=='listening'||String(route?.packageCode||'')!==code)return;
      setAudioMessage((error?.message||'Indeks audio gagal dimuat.')+' Transkrip dan soal tetap tersedia.',true,false);
    }
  }
  window.__hskRetryListeningAudio=function(){
    if(audio){audio.pause();audio.removeAttribute('src');audio.load();activeAudioUrl=''}
    return loadAudioForPackage(String(route?.packageCode||''),true);
  };

  function instructionForPart(part){
    const pkg=DB[String(route?.packageCode||'')];
    const firstId=Number(part.questions?.[0]?.[0]);
    const rules=pkg?.engineRules?.sections?.listening?.parts||[];
    const rule=rules.find(function(item){
      const range=item?.range;
      return Array.isArray(range)&&Number.isFinite(firstId)&&firstId>=Number(range[0])&&firstId<=Number(range[1]);
    });
    if(rule?.instruction)return String(rule.instruction);
    if(typeof instructionFor==='function'){
      const prior=route.sectionIndex,priorQuestions=currentQuestions;
      route.sectionIndex=part.index;currentQuestions=part.questions;
      try{return String(instructionFor('listening',part.index)||'')}
      finally{route.sectionIndex=prior;currentQuestions=priorQuestions}
    }
    return '';
  }
  function escape(value){
    return typeof esc==='function'?esc(value):String(value??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  }
  function divider(part,index){
    const title=String(part.section?.title||('Bagian '+(index+1)));
    const label=title+' · Soal '+String(part.range||'').replace('-', '–');
    const instruction=instructionForPart(part);
    return '<div class="listeningPartDivider'+(index===0?' is-first':'')+'" role="separator"><span>'+escape(label)+'</span>'+(instruction?'<small>'+escape(instruction)+'</small>':'')+'</div>';
  }
  function progressMarkup(stats){
    const pct=stats.total?Math.round(stats.answered/stats.total*100):0;
    return '<div class="sectionProgress listeningCombinedProgress"><div class="progressMeta"><strong>Progres Listening</strong><span>'+stats.answered+'/'+stats.total+' terjawab · '+pct+'%</span></div><div class="progressBar"><div class="fill" style="width:'+pct+'%"></div></div></div>';
  }
  function nextAvailableType(code){
    const types=Object.keys(META||{});
    const current=types.indexOf('listening');
    const pkg=DB[String(code||'')];
    for(let t=Math.max(0,current+1);t<types.length;t++){
      const type=types[t],parts=Array.isArray(pkg?.[type])?pkg[type]:[];
      const index=parts.findIndex(function(part){return Array.isArray(part?.questions)&&part.questions.length>0});
      if(index>=0)return {type:type,index:index};
    }
    return null;
  }
  async function goNext(){
    const code=String(route?.packageCode||''),target=nextAvailableType(code);
    if(!target){if(typeof appNotice==='function')appNotice('Tidak ada bagian berikutnya','Semua bagian paket ini sudah selesai.');return}
    try{
      if(target.type==='reading'&&typeof window.__hskEnsureReadingPassages==='function')await window.__hskEnsureReadingPassages();
      if(typeof window.__hskLoadPackage==='function')await window.__hskLoadPackage(code);
      const section=DB[code]?.[target.type]?.[target.index];
      if(!section||!Array.isArray(section.questions)||!section.questions.length){
        if(typeof appNotice==='function')appNotice('Bagian belum tersedia','Data soal untuk bagian berikutnya belum berhasil dimuat.');
        return;
      }
      route={screen:'exercise',packageCode:code,type:target.type,sectionIndex:Number(target.index),studyPlanId:route.studyPlanId||null};
      window.route=route;
      resumeQuestionId=null;window.__hskResumePage=0;
      loadCurrentSectionState();renderExercise();setScreen('exercise',true);
    }catch(error){
      console.error('Continue after Listening failed',error);
      if(typeof appNotice==='function')appNotice('Bagian berikutnya gagal dimuat',error?.message||'Silakan coba lagi.');
    }
  }
  function finishCard(){
    if(resultState){
      const result=resultState,pct=result.total?Math.round(result.score/result.total*100):0;
      const target=nextAvailableType(route.packageCode);
      const next=target?'<button class="finishCardBtn" type="button" onclick="__hskNextAfterListening()"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span><span>Lanjut ke '+escape(META[target.type]?.label||target.type)+'</span></button>':'';
      return '<div class="finishCard checked"><div class="inlineResult"><div class="inlineResultLabel">Nilai Listening</div><div class="inlineResultScore">'+pct+'%</div><div class="inlineResultMeta"><b>'+result.score+'/'+result.total+'</b> benar · '+result.answered+' dijawab · '+(result.total-result.answered)+' belum dijawab</div><div class="inlineResultBar"><i style="width:'+pct+'%"></i></div></div><div class="finishCardActions finishCardNav"><button class="finishCardBtn" type="button" onclick="backRoute()"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_back</span><span>Kembali ke Paket</span></button>'+next+'</div><div class="finishCardActions finishCardRepeat"><button class="finishCardBtn finishCardBtnSecondary" type="button" onclick="__hskRepeatListening()"><span class="material-symbols-rounded ico actionRepeat" aria-hidden="true">refresh</span><span>Reset Listening</span></button></div></div>';
    }
    return '<div class="finishCard"><div class="finishCardTitle">Sudah selesai mengerjakan Listening?</div><div class="finishCardText">Periksa semua jawaban sekaligus. Jawaban dan progres disimpan per bagian seperti sebelumnya.</div><div class="finishCardActions"><button class="finishCardBtn" type="button" onclick="grade()"><span class="material-symbols-rounded ico" aria-hidden="true">check</span><span>Periksa &amp; Lihat Nilai</span></button><button class="finishCardBtn finishCardBtnSecondary" type="button" onclick="__hskRepeatListening()"><span class="material-symbols-rounded ico actionRepeat" aria-hidden="true">refresh</span><span>Reset Listening</span></button></div></div>';
  }
  function renderCombined(){
    const code=String(route?.packageCode||'');
    const parts=listeningParts(code).filter(function(part){return part.questions.length>0});
    if(!parts.length){
      if(typeof window.showExerciseLoadRecovery==='function')window.showExerciseLoadRecovery('Listening belum tersedia','Paket ini belum memiliki soal Listening yang dapat ditampilkan.');
      return;
    }
    rebuildSourceMap(code,parts);
    const flat=[];
    parts.forEach(function(part){flat.push.apply(flat,part.questions)});
    currentQuestions=flat;
    currentMode='choice';
    const pkg=DB[code]||{};
    const title=document.getElementById('exTitle');
    const sub=document.querySelector('#exercise .section .sub');
    const exPart=document.getElementById('exPart');
    const exPkg=document.getElementById('exPkg');
    const exType=document.getElementById('exType');
    if(exPkg)exPkg.textContent=pkg.title||code;
    if(exType)exType.textContent=META.listening?.label||'Listening';
    if(exPart)exPart.textContent='Semua Soal Listening';
    if(title){title.textContent='Listening';title.classList.remove('hsk5PaperSectionHeader')}
    if(sub){sub.textContent=flat.length+' soal · semua bagian tampil berurutan';sub.style.display=''}
    const stats=sectionStats(code,'listening',-1);
    let cards='';
    const previousIndex=route.sectionIndex;
    parts.forEach(function(part,index){
      route.sectionIndex=part.index;
      currentQuestions=part.questions;
      cards+=divider(part,index);
      cards+=typeof renderQuestionCards==='function'?renderQuestionCards():'';
    });
    route.sectionIndex=previousIndex;
    currentQuestions=flat;
    const questions=document.getElementById('questions');
    if(questions)questions.innerHTML=progressMarkup(stats)+cards+finishCard();
    restoreQuestionUI();
    const audioDock=ensureDock();
    if(audioDock)audioDock.hidden=false;
    loadAudioForPackage(code,false);
  }
  const priorRender=window.renderExercise||original.renderExercise;
  window.renderExercise=function(){
    if(route?.type!=='listening'){
      const host=ensureDock();if(host)host.hidden=true;
      if(audio)audio.pause();
      return priorRender?.apply(this,arguments);
    }
    if(Number(route.sectionIndex)!==-1){
      route={...route,screen:'exercise',sectionIndex:-1};
      window.route=route;
      loadCurrentSectionState();
    }else{
      route.screen='exercise';window.route=route;
    }
    return renderCombined();
  };
  if(typeof original.openSections==='function'){
    window.openSections=async function(code,type,push){
      if(String(type)!=='listening')return original.openSections.apply(this,arguments);
      code=String(code||'');
      if(!code)return;
      try{
        if(typeof window.__hskLoadPackage==='function')await window.__hskLoadPackage(code);
        if(!DB[code])throw new Error('Data paket tidak tersedia.');
        route={screen:'exercise',packageCode:code,type:'listening',sectionIndex:-1,studyPlanId:route?.studyPlanId||null};
        window.route=route;
        resumeQuestionId=null;window.__hskResumePage=0;
        loadCurrentSectionState();
        renderExercise();
        setScreen('exercise',push!==false);
        requestAnimationFrame(function(){window.scrollTo({top:0,left:0,behavior:'auto'})});
      }catch(error){
        console.error('open Listening failed',error);
        if(typeof appNotice==='function')appNotice('Listening gagal dibuka',error?.message||'Silakan coba lagi.');
      }
    };
  }
  if(typeof original.startSection==='function'){
    window.startSection=async function(index,push){
      if(route?.type==='listening')return window.openSections(route.packageCode,'listening',push);
      return original.startSection.apply(this,arguments);
    };
  }
  window.__hskNextAfterListening=goNext;
  window.__hskRepeatListening=function(){
    if(route?.type!=='listening')return;
    if(typeof window.resetSectionProgress==='function')window.resetSectionProgress(route.packageCode,'listening');
  };

  const priorSetScreen=window.setScreen;
  if(typeof priorSetScreen==='function'&&!priorSetScreen.__hskListeningDock){
    const setScreenWithListeningDock=function(name,push){
      const result=priorSetScreen.apply(this,arguments);
      const host=ensureDock();
      if(host){
        const visible=String(name)==='exercise'&&route?.type==='listening';
        host.hidden=!visible;
        if(!visible&&audio)audio.pause();
      }
      return result;
    };
    setScreenWithListeningDock.__hskListeningDock=true;
    setScreenWithListeningDock.__hskOriginal=priorSetScreen;
    window.setScreen=setScreenWithListeningDock;
    try{setScreen=setScreenWithListeningDock}catch(e){}
  }
  const initialDock=ensureDock();
  if(initialDock)initialDock.hidden=true;
})();