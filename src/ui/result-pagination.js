/* Source module: result pagination.
 * Exact extraction from the prior inline script block.
 * Preserve execution order and legacy globals during this rebuild.
 */

(function(){
  const PAGE_SIZE=10;
  let page=0;
  function questionPages(){
    const pkg=getActivePackageData();
    const isHsk5PassageSection=isHsk5Model(pkg)&&route.type==='reading'&&currentQuestions.length>0&&currentQuestions.every(q=>{
      const m=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
      return (m.type==='fill_blank'||m.type==='choice')&&!!m.group?.id;
    });
    if(!isHsk5PassageSection){
      const pages=[];
      for(let i=0;i<currentQuestions.length;i+=PAGE_SIZE)pages.push(currentQuestions.slice(i,i+PAGE_SIZE));
      return pages.length?pages:[[]];
    }
    const groups=[];
    let group=[];
    let groupId='';
    for(const q of currentQuestions){
      const m=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
      const gid=String(m.group.id);
      if(group.length&&gid!==groupId){groups.push(group);group=[];}
      group.push(q);
      groupId=gid;
    }
    if(group.length)groups.push(group);

    const pages=[];
    let current=[];
    for(const g of groups){
      if(current.length&&current.length+g.length>PAGE_SIZE){pages.push(current);current=[];}
      current.push(...g);
    }
    if(current.length)pages.push(current);
    return pages.length?pages:[[]];
  }
  function pageCount(){return questionPages().length;}
  function visible(){return questionPages()[Math.max(0,Math.min(page,pageCount()-1))]||[];}
  function cardsForVisible(){const all=currentQuestions;const shown=visible();currentQuestions=shown;const h=renderQuestionCards();currentQuestions=all;return h;}
  function restoreVisible(){const all=currentQuestions;currentQuestions=visible();restoreQuestionUI();if(currentMode==='writing'&&isSequenceWriting(route.type,route.sectionIndex))currentQuestions.forEach(q=>refreshWordBank(String(q[0])));currentQuestions=all;}
  function pager(){const n=pageCount();if(n<=1)return '';const prev=page>0?'<button class="btn" type="button" onclick="changeQuestionPage(-1)">‹ Sebelumnya</button>':'';const next=page<n-1?'<button class="btn" type="button" onclick="changeQuestionPage(1)">Berikutnya ›</button>':'';return '<div class="questionPager">'+prev+'<span class="pageIndicator">Halaman '+(page+1)+' / '+n+'</span>'+next+'</div>';}
  function nextSectionTarget(){
    const code=String(route.packageCode||'');
    const currentType=String(route.type||'');
    const currentIndex=Number(route.sectionIndex);
    const order=Object.keys(META);
    const pkg=DB[code];
    if(!pkg)return null;

    // First: continue within the current paper/part.
    const currentArr=Array.isArray(pkg[currentType])?pkg[currentType]:[];
    for(let i=currentIndex+1;i<currentArr.length;i++){
      if(Array.isArray(currentArr[i]?.questions)&&currentArr[i].questions.length){
        return {type:currentType,index:i};
      }
    }

    // No more sections here: continue to the next available paper.
    const typePos=order.indexOf(currentType);
    for(let t=Math.max(0,typePos+1);t<order.length;t++){
      const type=order[t];
      const arr=Array.isArray(pkg[type])?pkg[type]:[];
      const first=arr.findIndex(sec=>Array.isArray(sec?.questions)&&sec.questions.length);
      if(first>=0)return {type,index:first};
    }
    return null;
  }

  window.nextSection=async function(){
    const target=nextSectionTarget();
    if(!target)return;
    const code=String(route.packageCode||'');
    try{
      if(typeof window.__hskLoadPackage==='function')await window.__hskLoadPackage(code);
      const arr=DB[code]?.[target.type]||[];
      const sec=arr[target.index];
      if(!sec||!Array.isArray(sec.questions)||!sec.questions.length){
        appNotice('Bagian belum tersedia','Data soal untuk bagian berikutnya belum berhasil dimuat.');
        return;
      }
      route={
        screen:'exercise',
        packageCode:code,
        type:target.type,
        sectionIndex:Number(target.index),
        studyPlanId:route.studyPlanId||null
      };
      resumeQuestionId=null;
      page=0;
      window.__hskResumePage=0;
      loadCurrentSectionState();
      renderExercise();
      setScreen('exercise',true);
    }catch(e){
      console.error('nextSection failed',e);
      appNotice('Bagian berikutnya gagal dimuat',e.message||'Silakan coba lagi.');
    }
  };
  function finishCard(){
    if(page!==pageCount()-1)return '';
    const isWriting=route.type==='writing';
    const checkedNow=!!resultState;
    if(checkedNow){
      const r=resultState;
      const writing=isWriting&&!isSequenceWriting(route.type,route.sectionIndex);
      const pct=r.total?Math.round(r.score/r.total*100):0;
      const next=nextSectionTarget();
      const backCode=JSON.stringify(String(route.packageCode||''));
      const backType=JSON.stringify(String(route.type||''));
      const resultHtml=writing
        ? '<div class="inlineResult"><div class="inlineResultLabel">Hasil bagian</div><div class="inlineResultScore">'+r.answered+'/'+r.total+'</div><div class="inlineResultMeta">jawaban tersimpan</div><div class="inlineResultNote"><b>Writing tidak dinilai otomatis.</b> Periksa kembali tata bahasa dan penggunaan kata.</div></div>'
        : '<div class="inlineResult"><div class="inlineResultLabel">Nilai bagian</div><div class="inlineResultScore">'+pct+'%</div><div class="inlineResultMeta"><b>'+r.score+'/'+r.total+'</b> benar · '+r.answered+' dijawab · '+(r.total-r.answered)+' belum dijawab</div><div class="inlineResultBar"><i style="width:'+pct+'%"></i></div></div>';
      const nextBtn=next?'<button class="finishCardBtn" type="button" onclick="nextSection()"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span><span>Lanjut ke Bagian Selanjutnya</span></button>':'';
      return '<div class="finishCard checked">'+resultHtml+'<div class="finishCardActions finishCardNav">'+
        '<button class="finishCardBtn" type="button" onclick="returnToParts()"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_back</span><span>Kembali ke Bagian</span></button>'+
        nextBtn+
        '</div><div class="finishCardActions finishCardRepeat"><button class="finishCardBtn finishCardBtnSecondary" type="button" onclick="repeat()"><span class="material-symbols-rounded ico actionRepeat" aria-hidden="true">refresh</span><span>Ulangi Bagian</span></button></div></div>';
    }
    const note=isWriting&&!isSequenceWriting(route.type,route.sectionIndex)
      ? 'Periksa semua jawabanmu lalu lihat ringkasan jawaban. Writing tidak dinilai benar/salah otomatis.'
      : 'Periksa semua jawaban sekaligus dan lihat nilai bagian ini. Hasil akan muncul di bawah soal tanpa meninggalkan halaman.';
    return '<div class="finishCard"><div class="finishCardTitle">Sudah selesai mengerjakan?</div><div class="finishCardText">'+esc(note)+'</div><div class="finishCardActions"><button class="finishCardBtn" type="button" onclick="grade()">'+svg('check')+' <span>Periksa &amp; Lihat Nilai</span></button><button class="finishCardBtn finishCardBtnSecondary" type="button" onclick="repeat()"><span class="material-symbols-rounded ico actionRepeat" aria-hidden="true">refresh</span><span>Ulangi Bagian</span></button></div></div>';
  }
  window.changeQuestionPage=function(delta){const n=pageCount(),next=Math.max(0,Math.min(n-1,page+delta));if(next===page)return;page=next;window.__hskResumePage=page;const qwrap=$('questions');if(!qwrap)return;const instruction=qwrap.querySelector('.instruction'),progress=qwrap.querySelector('.sectionProgress');const hsk5ReadingPartNow=isHsk5Model(getActivePackageData())&&route.type==='reading'&&hsk5ReadingPart(currentQuestions);const isHsk5ReadingPaperHeader=hsk5ReadingPartNow==='part1'||hsk5ReadingPartNow==='part2'||hsk5ReadingPartNow==='part3';const prefix=(isHsk5ReadingPaperHeader?'':(instruction?instruction.outerHTML:''))+(progress?progress.outerHTML:'');qwrap.innerHTML=prefix+cardsForVisible()+pager()+finishCard();restoreVisible();window.scrollTo({top:Math.max(0,qwrap.getBoundingClientRect().top+window.scrollY-12),behavior:'auto'});};
  window.jumpToQuestionPage=function(target){
    const n=pageCount();const next=Math.max(0,Math.min(n-1,Number(target)||0));
    if(next===page)return;
    page=next;window.__hskResumePage=page;
    const qwrap=$('questions');if(!qwrap)return;
    const instruction=qwrap.querySelector('.instruction'),progress=qwrap.querySelector('.sectionProgress');
    const prefix=(instruction?instruction.outerHTML:'')+(progress?progress.outerHTML:'');
    qwrap.innerHTML=prefix+cardsForVisible()+pager()+finishCard();restoreVisible();
  };
  function inlineResult(){
    if(!resultState)return '';
    const r=resultState;
    const isWriting=route.type==='writing' && !isSequenceWriting(route.type,route.sectionIndex);
    const pct=r.total?Math.round(r.score/r.total*100):0;
    if(isWriting){
      return '<div class="inlineResult"><div class="inlineResultHead"><div><div class="inlineResultLabel">Hasil bagian</div><div class="inlineResultScore">'+r.answered+'/'+r.total+'</div><div class="inlineResultMeta">jawaban tersimpan</div></div><span class="inlineResultBadge">✓ Sudah diperiksa</span></div><div class="inlineResultNote"><b>Writing tidak dinilai otomatis.</b> Gunakan contoh jawaban dan periksa kembali tata bahasa serta penggunaan kata.</div></div>';
    }
    return '<div class="inlineResult"><div class="inlineResultHead"><div><div class="inlineResultLabel">Nilai bagian</div><div class="inlineResultScore">'+pct+'%</div><div class="inlineResultMeta"><b>'+r.score+'/'+r.total+'</b> benar · '+r.answered+' dijawab · '+(r.total-r.answered)+' belum dijawab</div></div><span class="inlineResultBadge">✓ Sudah diperiksa</span></div><div class="inlineResultBar"><i style="width:'+pct+'%"></i></div></div>';
  }
  window.renderExercise=function(){const sec=DB[route.packageCode]?.[route.type]?.[route.sectionIndex];if(!sec){openSections(route.packageCode,route.type,false);return;}currentQuestions=Array.isArray(sec.questions)?sec.questions:[];currentMode=route.type==='writing'?'writing':'choice';$('exPkg').textContent=(DB[route.packageCode]?.title||route.packageCode);$('exType').textContent=META[route.type]?.label||route.type;$('exPart').textContent=sec.title.replace(/^.*?·\s*/,'');const hsk5ReadingPartNow=isHsk5Model(getActivePackageData())&&route.type==='reading'&&hsk5ReadingPart(currentQuestions);const isHsk5ReadingPart1=hsk5ReadingPartNow==='part1';const isHsk5ReadingPart2=hsk5ReadingPartNow==='part2';const isHsk5ReadingPaperHeader=isHsk5ReadingPart1||isHsk5ReadingPart2||hsk5ReadingPartNow==='part3';const exTitle=$('exTitle');const exSub=document.querySelector('#exercise .section .sub');if(isHsk5ReadingPart1){exTitle.innerHTML='<div class="hsk5PaperSectionTitle">第一部分</div><div class="hsk5PaperSectionInstruction">第 46-60 题：请选出正确答案。</div>';exTitle.classList.add('hsk5PaperSectionHeader');if(exSub)exSub.style.display='none';}else if(isHsk5ReadingPart2){exTitle.innerHTML='<div class="hsk5PaperSectionTitle">第二部分</div><div class="hsk5PaperSectionInstruction">第 61-70 题：请选择与试题内容一致的一项。</div>';exTitle.classList.add('hsk5PaperSectionHeader');if(exSub)exSub.style.display='none';}else if(hsk5ReadingPartNow==='part3'){exTitle.innerHTML='<div class="hsk5PaperSectionTitle">第三部分</div><div class="hsk5PaperSectionInstruction">第 71-90 题：请选出正确答案。</div>';exTitle.classList.add('hsk5PaperSectionHeader');if(exSub)exSub.style.display='none';}else{exTitle.textContent=sec.title;exTitle.classList.remove('hsk5PaperSectionHeader');if(exSub)exSub.style.display='';}const st=sectionStats(route.packageCode,route.type,route.sectionIndex);const instruction=instructionFor(route.type,route.sectionIndex);const prefix=isHsk5ReadingPaperHeader?'':'<div class="instruction"><h2>Petunjuk</h2><p>'+esc(instruction)+'</p></div>';$('questions').innerHTML=prefix+'<div class="sectionProgress"><div class="progressMeta"><strong>Progres bagian</strong><span>'+st.answered+'/'+st.total+' terjawab · '+st.pct+'%</span></div><div class="progressBar"><div class="fill" style="width:'+st.pct+'%"></div></div></div>'+cardsForVisible()+pager()+finishCard();restoreVisible();};
    window.repeat=(function(fn){return function(){page=0;return fn()}})(repeat);
  function userText(q){const id=String(q[0]),u=answers[id];if(u===undefined||String(u).trim()==='')return 'Belum dijawab';const model=getResolvedQuestionModel(getActivePackageData(),route.type,route.sectionIndex,q);if(model.type==='sentence_ordering'||model.type==='guided_writing'||model.type==='picture_writing')return String(u);const opt=model.options[Number(u)];return opt?`${opt.label}. ${opt.value}`:String(u)}
function correctText(q){const model=getResolvedQuestionModel(getActivePackageData(),route.type,route.sectionIndex,q);if(model.type==='sentence_ordering'||model.type==='sequence'){const k=sequenceKeys(q);return k.length?k.join(' / '):'Tidak tersedia'}if(model.type==='guided_writing'||model.type==='picture_writing')return String(q[2]||'Tidak tersedia');const ci=correctIndex(q,route.type);const opt=model.options[ci];return opt?`${opt.label}. ${opt.value}`:String(q[3]??'Tidak tersedia')}
window.renderResult=function(){const rp=$('resultPkg'),rt=$('resultType'),rpart=$('resultPart');if(rp)rp.textContent=route.packageCode;if(rt)rt.textContent=META[route.type]?.label||route.type;const _resTitle=DB[route.packageCode]?.[route.type]?.[route.sectionIndex]?.title||'';if(rpart)rpart.textContent='Hasil · '+_resTitle.replace(/^.*?·\s*/, '');const r=resultState||{score:0,total:currentQuestions.length,answered:0},seq=isSequenceWriting(route.type,route.sectionIndex),pct=r.total?Math.round(r.score/r.total*100):0;const list=currentQuestions.map((q,i)=>{const id=String(q[0]),u=answers[id],has=u!==undefined&&String(u).trim()!=='';if(route.type==='writing'&&!seq)return '<article class="resultQuestion"><div class="resultQuestionHead"><span>Soal '+(i+1)+' · 第 '+esc(id)+' 题</span><span class="resultStatus empty">Tidak dinilai</span></div><div class="resultQuestionText">'+esc(q[1]||'')+'</div><div class="resultAnswer"><b>Jawabanmu:</b> '+esc(userText(q))+'<br><b>Contoh jawaban:</b> '+esc(correctText(q))+'</div></article>';const ok=has&&isCorrect(q,u,route.type,route.sectionIndex);return '<article class="resultQuestion"><div class="resultQuestionHead"><span>Soal '+(i+1)+' · 第 '+esc(id)+' 题</span><span class="resultStatus '+(ok?'good':has?'bad':'empty')+'">'+(ok?'✓ Benar':has?'✗ Salah':'Belum dijawab')+'</span></div><div class="resultQuestionText">'+esc(q[1]||'')+'</div><div class="resultAnswer"><b>Jawabanmu:</b> '+esc(userText(q))+(has&&!ok?'<br><b>Jawaban benar:</b> '+esc(correctText(q)):'')+'</div></article>';}).join('');const title=DB[route.packageCode][route.type][route.sectionIndex]?.title||'Hasil';const summary=(route.type==='writing'&&!seq)?'<p><b>'+r.answered+'/'+r.total+'</b> jawaban tersimpan.</p>':'<div class="score">'+pct+'%</div><div class="bar"><div class="fill" style="width:'+pct+'%"></div></div><p><b>'+r.score+'/'+r.total+'</b> benar · '+r.answered+' dijawab · '+(r.total-r.answered)+' belum dijawab</p>';$('resultBody').innerHTML='<div class="result"><div class="sub">'+esc(title)+'</div>'+summary+'<div class="resultList">'+list+'</div><div class="resultActions"><button class="btn soft" onclick="returnToQuestions()">← Kembali ke Soal</button><button class="btn" onclick="returnToParts()">← Kembali ke List Bagian</button><button class="btn" onclick="repeat()">↻ Ulangi</button></div></div>';};
  window.returnToQuestions=async function(){const target={...route,screen:'exercise'};route=target;if(typeof window.__hskLoadPackage==='function'&&target.packageCode)await window.__hskLoadPackage(String(target.packageCode));loadCurrentSectionState();renderExercise();setScreen('exercise',false);};
  window.returnToParts=async function(){
    const code=String(route.packageCode||'');
    const type=String(route.type||'');
    if(!code||!type)return;
    try{
      if(typeof window.__hskLoadPackage==='function')await window.__hskLoadPackage(code);
      route={
        screen:'parts',
        packageCode:code,
        type:type,
        sectionIndex:null,
        studyPlanId:route.studyPlanId||null
      };
      if(typeof renderSections==='function')renderSections();
      setScreen('partsScreen',true);
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
    }catch(e){
      console.error('returnToParts failed',e);
      appNotice('Tidak dapat kembali ke bagian',e.message||'Silakan coba lagi.');
    }
  };
})();
