function isSequenceReadingQuestion(id){const pkg=getActivePackageData();if(getPackageEngineRules(pkg))return false;const code=String(route?.packageCode||'');return route&&route.type==='reading'&&(Number(id)>=56&&Number(id)<=65||((code.startsWith('WB4A')||code.startsWith('WB4B'))&&Number(route.sectionIndex)===2)||code==='HSK4-SUSUN-KALIMAT');}
function resolvedQuestionSectionIndex(q,type,idx){const requested=idx===undefined?route?.sectionIndex:idx;if(type==='listening'&&Number(requested)===-1){const source=window.__hskListeningSourceIndex?.(q?.[0]);return source===null||source===undefined?0:Number(source)}return requested}
function correctIndex(q,type,idx=route?.sectionIndex){const sourceIndex=resolvedQuestionSectionIndex(q,type,idx);const model=getResolvedQuestionModel(getActivePackageData(),type,sourceIndex,q);const key=String(q?.[3]??"").trim();if(model.type==="sentence_ordering"||model.type==="guided_writing"||model.type==="picture_writing")return -1;if(/^[A-F]$/i.test(key))return key.toUpperCase().charCodeAt(0)-65;const opts=q?.[2]||[];const direct=opts.findIndex(o=>norm(o)===norm(key));if(direct>=0)return direct;if(key==="√"){const i=opts.findIndex(o=>norm(o)==="对");if(i>=0)return i}if(key==="×"){const i=opts.findIndex(o=>norm(o)==="错");if(i>=0)return i}return -1}
function isCorrect(q,u,type,idx=route?.sectionIndex){const sourceIndex=resolvedQuestionSectionIndex(q,type,idx);const model=getResolvedQuestionModel(getActivePackageData(),type,sourceIndex,q);if(model.type==="sentence_ordering"||model.type==="sequence")return isSequenceAnswerCorrect(q,u);if(model.type==="guided_writing"||model.type==="picture_writing")return false;const ci=correctIndex(q,type,sourceIndex);return Number(u)===ci}



function progressHTML(st,label='Progres'){return `<div class="progressWrap"><div class="progressMeta"><span>${label}</span><span>${st.answered}/${st.total} · ${st.pct}%</span></div><div class="progressBar"><div class="fill" style="width:${st.pct}%"></div></div></div>`}
function renderPackageProgress(code){const st=packageStats(code);return progressHTML({answered:st.answered,total:st.total,pct:st.pct},'Progres paket')}
function renderContext(){const c=$('context');const tb=$('topBack');const top=document.querySelector('.top');if(top){const isHome=route.screen==='home';document.body.classList.toggle('home-route',isHome);top.classList.toggle('homeTopHidden',isHome);top.style.setProperty('display',isHome?'none':'','important');const nav=document.querySelector('.mainNav');if(nav)nav.classList.remove('focusNavHidden');}if(tb){const hideBack=route.screen==='home'||route.screen==='levels'||route.screen==='studyPlans';tb.style.setProperty('display',hideBack?'none':'inline-flex','important');}c.classList.remove('show');c.innerHTML=''}
function armHome(){if(typeof window.__hskArmBackGuard==='function'){window.__hskArmBackGuard()} }
function goHome(push=true){route={screen:'home',packageCode:null,type:null,sectionIndex:null};answers={};checked={};resultState=null;setScreen('home',push);armHome()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushCloudSync()});
window.addEventListener('pagehide',()=>flushCloudSync());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentUsername){pullCloudState()}});
window.addEventListener('focus',()=>{if(currentUsername)pullCloudState()});

function renderPackage(){let code=route.packageCode;let d=DB[code]||{};const progressStore=readStore();$('pkgCrumb').textContent=code;$('pkgTitle').textContent='Paket '+code;const palettes={listening:{accent:'#ff6548',soft:'#fff0eb'},reading:{accent:'#7890d8',soft:'#eef2ff'},writing:{accent:'#e5ad3d',soft:'#fff5df'}};$('parts').innerHTML=Object.entries(META).map(([t,m])=>{const arr=d[t]||[],total=arr.reduce((a,x)=>a+x.questions.length,0),ps=arr.reduce((a,x,i)=>{const st=sectionStats(code,t,i,progressStore);return {answered:a.answered+st.answered,total:a.total+st.total}},{answered:0,total:0});ps.pct=ps.total?Math.round(ps.answered/ps.total*100):0;const pal=palettes[t]||palettes.listening;return total?`<button class="partCard flatPartCard" style="--part-accent:${pal.accent};--part-soft:${pal.soft}" type="button" onclick="openSections('${esc(code)}','${t}')"><span class="partHanzi" aria-hidden="true">${esc(m.zh)}</span><span class="partMain"><strong>${esc(m.label)}</strong><span class="partMeta">${total} soal tersedia</span>${progressHTML(ps,'Progres bagian')}</span><span class="partArrow" aria-hidden="true"><span class="material-symbols-rounded ico">arrow_forward</span></span></button>`:`<div class="partCard flatPartCard partDisabled" style="--part-accent:${pal.accent};--part-soft:${pal.soft}" aria-disabled="true"><span class="partHanzi" aria-hidden="true">${esc(m.zh)}</span><span class="partMain"><strong>${esc(m.label)}</strong><span class="partMeta">Belum tersedia dari sumber paket</span></span></div>`}).join('')+`<div style="grid-column:1/-1">${renderPackageProgress(code)}</div>`}
function renderSections(){const d=DB[route.packageCode]?.[route.type]||[];const progressStore=readStore();const m=META[route.type];if(!m){goHome(false);return}$('partsPkg').textContent=route.packageCode;$('partsCrumb').textContent=m.label;$('partsTitle').innerHTML='<span class="kaiti-ui-hanzi">'+escV17(m.zh)+'</span><span aria-hidden="true"> · </span>'+escV17(m.label);const available=d.map((s,i)=>({s,i})).filter(x=>Array.isArray(x.s.questions)&&x.s.questions.length>0);let arr=available.map(({s,i})=>{let st=sectionStats(route.packageCode,route.type,i,progressStore);const sectionName=s.title.replace(/^.*?·\s*/,'');return `<button class="tile sectionPartTile" onclick="startSection(${i})"><div class="sectionPartTitle kaiti-ui-hanzi">${esc(sectionName)}</div><small>Soal ${esc(s.range)} · ${s.questions.length} soal</small>${progressHTML(st,'Progres bagian')}</button>`});$('sections').innerHTML=arr.length?arr.join(''):`<div class="notice"><strong>${route.packageCode} · ${m.label}</strong><br>Bagian ini belum tersedia sebagai teks soal pada paket ini.</div>`}
function loadCurrentSectionState(){const st=getSectionState(route.packageCode,route.type,route.sectionIndex);answers={...st.answers};checked={...st.checked};answerEvents={...st.answerEvents};resultState=null}
function instructionFor(type,idx){const code=String(route?.packageCode||'');const pkg=getActivePackageData();const id=Number(currentQuestions?.[0]?.[0]?.[0]||currentQuestions?.[0]?.[0]||0);const parts=pkg?.engineRules?.sections?.[type]?.parts||[];const part=parts.find(p=>ruleRangeContains(p.range,id));if(part?.instruction)return part.instruction;if(code==='HSK4-SUSUN-KATA')return 'Susun kata-kata berikut menjadi kalimat Mandarin yang benar. Jawaban dinilai berdasarkan kunci jawaban.';if(code==='HSK4-SUSUN-KALIMAT')return 'Susun kalimat-kalimat berikut menjadi paragraf yang benar dengan memilih urutan yang tepat.';if(type==='listening')return idx===0?'Dengarkan pernyataan lalu pilih apakah kalimat tersebut benar atau salah.':idx===1?'Dengarkan percakapan dengan saksama lalu pilih jawaban yang paling sesuai.':'Dengarkan percakapan lalu tentukan jawaban yang paling tepat berdasarkan informasi yang kamu dengar.';if(type==='reading')return idx===0?'Baca kalimat dan pilihan jawaban, lalu pilih kata atau ungkapan yang paling tepat.':idx===1?'Baca setiap kalimat dan pilih jawaban yang paling sesuai dengan maknanya.':idx===2?'Susun bagian-bagian kalimat menjadi urutan yang benar dengan memilih kombinasi yang tepat.':'Baca teks dengan saksama lalu pilih jawaban yang paling sesuai dengan informasi dalam bacaan.';return idx===0?'Susun kata-kata menjadi kalimat Mandarin yang benar. Kamu bisa klik kata untuk memasukkannya otomatis, atau mengetik langsung di kolom jawaban. Jawaban dinilai berdasarkan kunci jawaban.':'Gunakan kata yang diberikan untuk membuat kalimat Mandarin yang benar, lalu ketik jawabanmu. Jawaban ini tidak dinilai benar atau salah secara otomatis.'}
function hsk5AutoPaperOptionLayout(){
  const pkg=getActivePackageData();
  const hsk5=isHsk5Model(pkg),hsk4=isHsk4PaperReading(pkg);
  if((!hsk5&&!hsk4) || route.type!=='reading') return;
  const part=hsk5?hsk5ReadingPart(currentQuestions):hsk4PaperPart(currentQuestions);
  document.querySelectorAll('#exercise .hsk5PaperOptions').forEach(container=>{
    if(container.closest('.hsk5PaperPart2')) return;
    const items=[...container.querySelectorAll(':scope > .hsk5PaperOption')];
    if(items.length!==4) return;

    /* Reading Part 1 + Part 3 follow one deterministic rule:
       <=3 Hanzi => A B C D; >=4 Hanzi in any option => A B / C D. */
    if((hsk5&&((part==='part1' && container.closest('.hsk5PaperPart1')) || (part==='part3' && container.closest('.hsk5PaperPart3')))) || (hsk4&&part==='part4'&&container.closest('.hsk4PaperPart4'))){
      const hasLongOption=items.some(el=>{
        const text=el.querySelector('.optText')?.textContent||el.textContent||'';
        const hanzi=(String(text).match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)||[]).length;
        return hanzi>=4;
      });
      container.classList.toggle('paperOptionsTwoRows',hasLongOption);
      container.classList.toggle('paperOptionsFourAcross',!hasLongOption);
      items.forEach(el=>{
        el.style.removeProperty('width');
        el.style.removeProperty('flex');
        el.style.removeProperty('white-space');
      });
      return;
    }

    const containerCss=container.getAttribute('style')||'';
    const itemCss=items.map(el=>el.getAttribute('style')||'');
    container.classList.remove('paperOptionsTwoRows');
    container.style.setProperty('display','flex','important');
    container.style.setProperty('flex-wrap','nowrap','important');
    container.style.setProperty('gap','2px 20px','important');
    items.forEach(el=>{
      el.style.setProperty('width','max-content','important');
      el.style.setProperty('flex','0 0 auto','important');
      el.style.setProperty('white-space','nowrap','important');
    });
    const gap=20;
    const needed=items.reduce((sum,el)=>sum+el.getBoundingClientRect().width,0)+(items.length-1)*gap;
    const fits=needed<=container.clientWidth+1;
    if(!fits) container.classList.add('paperOptionsTwoRows');
    container.setAttribute('style',containerCss);
    items.forEach((el,i)=>{
      if(itemCss[i]) el.setAttribute('style',itemCss[i]); else el.removeAttribute('style');
    });
  });
}
function scheduleHsk5AutoPaperOptionLayout(){
  requestAnimationFrame(()=>{
    hsk5AutoPaperOptionLayout();
    requestAnimationFrame(hsk5AutoPaperOptionLayout);
  });
}
function renderExercise(){
  const sec=DB[route.packageCode]?.[route.type]?.[route.sectionIndex];
  if(!sec){openSections(route.packageCode,route.type,false);return}
  currentQuestions=Array.isArray(sec.questions)?sec.questions:[];
  page=Math.max(0,Math.min(pageCount()-1,Number(window.__hskResumePage||0)));
  window.__hskResumePage=page;
  currentMode=route.type==='writing'?'writing':'choice';
  $('exPkg').textContent=route.packageCode;
  $('exType').textContent=META[route.type]?.label||route.type;
  $('exPart').textContent=sec.title.replace(/^.*?·\s*/,'');
  const isHsk4Paper=isHsk4PaperReading(getActivePackageData());
  const exTitle=$('exTitle');
  const exSub=document.querySelector('#exercise .section .sub');
  if(isHsk4Paper){
    exTitle.innerHTML=hsk4PaperHeaderHTML(route.sectionIndex);
    exTitle.classList.add('hsk5PaperSectionHeader');
    if(exSub)exSub.style.display='none';
  }else{
    exTitle.textContent=sec.title;
    exTitle.classList.remove('hsk5PaperSectionHeader');
    if(exSub)exSub.style.display='';
  }
  const st=sectionStats(route.packageCode,route.type,route.sectionIndex);
  const instruction=instructionFor(route.type,route.sectionIndex);
  const prefix=isHsk4Paper?'':('<div class="instruction"><h2>Petunjuk</h2><p>'+esc(instruction)+'</p></div>');
  $('questions').classList.toggle('hsk4PaperReading',isHsk4Paper);
  $('questions').innerHTML=prefix+'<div class="sectionProgress"><div class="progressMeta"><strong>Progres bagian</strong><span>'+st.answered+'/'+st.total+' terjawab · '+st.pct+'%</span></div><div class="progressBar"><div class="fill" style="width:'+st.pct+'%"></div></div></div>'+renderQuestionCards();
  restoreQuestionUI();
  scheduleHsk5AutoPaperOptionLayout();
  if(currentMode==='writing'&&isSequenceWriting(route.type,route.sectionIndex))currentQuestions.forEach(q=>refreshWordBank(String(q[0])));
}
function wordBankWords(id){const q=currentQuestions.find(x=>String(x[0])===String(id));return q?String(q[1]||'').trim().split(/\s+/).filter(Boolean):[]}
function getWordChipMap(id){const input=$('w'+id);const words=wordBankWords(id);if(!input)return [];const tokens=String(input.value||'').trim().split(/\s+/).filter(Boolean);const used=new Set();const map=[];tokens.forEach((token,ti)=>{let found=-1;for(let i=0;i<words.length;i++){if(!used.has(i)&&words[i]===token){found=i;break}}if(found>=0){used.add(found);map.push({chipIndex:found,tokenIndex:ti})}});return map}
function refreshWordBank(id){const used=new Set(getWordChipMap(id).map(x=>x.chipIndex));document.querySelectorAll(`.wordChip[data-q="${id}"]`).forEach(chip=>{const i=Number(chip.dataset.i);const on=used.has(i);chip.classList.toggle('used',on);chip.setAttribute('aria-pressed',on?'true':'false')})}
function wordChipClick(id,index){const input=$('w'+id);if(!input)return;const words=wordBankWords(id);const word=words[index];if(word===undefined)return;const map=getWordChipMap(id);const selected=map.find(x=>x.chipIndex===index);let tokens=String(input.value||'').trim().split(/\s+/).filter(Boolean);if(selected)tokens.splice(selected.tokenIndex,1);else tokens.push(word);input.value=tokens.join(' ');input.dispatchEvent(new Event('input',{bubbles:true}));if(document.activeElement===input)input.blur();refreshWordBank(id)}
function clearWordBankAnswer(id){const input=$('w'+id);if(!input)return;input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));if(document.activeElement===input)input.blur();refreshWordBank(id)}
function renderWordBank(q,id){if(currentMode!=='writing'||!isSequenceWriting(route.type,route.sectionIndex))return '';const words=String(q[1]||'').trim().split(/\s+/).filter(Boolean);return '<div class="wordBank"><div class="wordBankLabel">Klik kata untuk memasukkannya ke kolom jawaban. Klik lagi untuk membatalkan.</div>'+words.map((w,i)=>'<button type="button" class="wordChip" data-q="'+esc(id)+'" data-i="'+i+'" aria-pressed="false" onclick="wordChipClick(\''+esc(id)+'\','+i+')">'+esc(w)+'</button>').join('')+'<div class="wordBankTools"><button type="button" class="wordBankClear" onclick="clearWordBankAnswer(\''+esc(id)+'\')">Hapus susunan</button></div></div>'}
function renderGuidedWritingWords(q){const text=String(q?.[1]||'').trim();const cut=text.lastIndexOf('。');if(cut<0)return '';const tail=text.slice(cut+1).trim();if(!tail)return '';const words=tail.split(/\s+/).filter(Boolean);if(words.length<2)return '';return '<div class="guidedWords"><div class="guidedWordsLabel">Kata wajib digunakan dalam paragraf:</div><div class="guidedWordsList">'+words.map(w=>'<span class="guidedWord">'+esc(w)+'</span>').join('')+'</div></div>'}function renderReadingPassage(id){const pkg=getActivePackageData();const pkgMap=pkg?.reading_passages?.[pkg.code]||{};const legacyMap=READING_PASSAGES[route.packageCode]||{};const maps=[pkgMap,legacyMap];const sid=String(id);let text='';for(const map of maps){if(!map||typeof map!=='object')continue;text=map[sid]||'';if(!text){const n=Number(sid);const key=Object.keys(map).find(k=>{const m=/^(\d+)-(\d+)$/.exec(k);return m&&n>=Number(m[1])&&n<=Number(m[2])});if(key)text=map[key]||''}if(text)break}if(!text)return '';return `<div class="readingPassage"><div class="rpLabel">Teks bacaan</div><div class="rpText">${esc(text)}</div></div>`}
function renderPassageClozeGroup(pkg,gid,qs){
  const root=pkg?.reading_passages?.[pkg.code]||{};
  let text=root[String(gid)]||"";
  if(!text)return "";
  let displayText=String(text);
  qs.forEach(q=>{
    const marker=String(q[0]);
    const token='@@HSK5BLANK_'+marker+'@@';
    const re=new RegExp('(^|[^0-9])\\s*'+marker+'\\s*(?=[^0-9]|$)','g');
    displayText=displayText.replace(re,'$1'+token);
  });
  let safeText=esc(displayText);
  qs.forEach(q=>{
    const marker=String(q[0]);
    const token='@@HSK5BLANK_'+marker+'@@';
    safeText=safeText.replaceAll(token,'<span class="hsk5ClozeBlank">'+esc(marker)+'</span>');
  });
  const passage='<div class="hsk5ClozePassage"><div class="hsk5ClozeHead"><span>TEKS BACAAN</span><strong>'+esc(gid)+'</strong></div><div class="hsk5ClozeText">'+safeText+'</div></div>';
  const body=qs.map(q=>{
    const id=String(q[0]);
    const model=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
    const labels=model.options.map((o,oi)=>{
      const selected=Number(answers[id])===oi;
      const state=checked[id]?(isCorrect(q,answers[id],route.type,route.sectionIndex)?'correct':'wrong'):'';
      return `<button type="button" class="opt ${selected?'selected':''} ${state}" data-q="${esc(id)}" data-i="${oi}" onclick="choose(this)"><span class="optText">${o.label}. ${esc(o.value)}</span></button>`;
    }).join('');
    const globalIndex=currentQuestions.findIndex(x=>String(x[0])===id)+1;
    return '<div class="hsk5ClozeQuestion"><div class="hsk5ClozeQtop"><strong>'+esc(id)+'.</strong></div><div class="hsk5ClozeOpts">'+labels+'</div><div class="row"><button class="btn soft" onclick="checkOne(\''+esc(id)+'\')">'+svg('check')+' Periksa</button></div><div class="feedback" id="f'+esc(id)+'"></div></div>';
  }).join('');
  return '<section class="hsk5PassageGroup">'+passage+'<div class="hsk5ClozeQuestions">'+body+'</div></section>';
}

function renderStandardQuestionCards(){let out='',lastPassage='';const pkg=getActivePackageData();currentQuestions.forEach((q,i)=>{const id=String(q[0]);const model=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);const isSeq=model.type==='sentence_ordering'||model.type==='sequence';const isWriting=model.type==='guided_writing'||model.type==='picture_writing';if(isSeq){out+=`<article class="question"><div class="qtop"><span>第 ${esc(id)} 题</span><span>${i+1}/${currentQuestions.length}</span></div><div class="qtext">Susun kata berikut menjadi kalimat yang benar:</div>${renderWordBank(q,id)}<textarea class="write writingAnswerField" id="w${id}" placeholder="Ketik atau pilih susunan kata di sini" autocomplete="off" rows="1" oninput="saveWriting(this);refreshWordBank('${id}');autoGrowWriting(this)" onfocus="autoGrowWriting(this)">${esc(answers[id]||'')}</textarea><div class="writingHint">✓ Bagian ini dinilai benar atau salah berdasarkan kunci jawaban. Urutan kata harus sesuai kunci.</div><div class="row"><button class="btn soft" onclick="checkOne('${id}')">${svg('check')} Periksa</button><button class="btn" onclick="showReference('${id}')">Lihat kunci jawaban</button></div><div class="feedback" id="f${id}"></div><div class="reference" id="r${id}">Kunci jawaban: ${esc(q[2]||'Tidak tersedia')}</div></article>`;return}if(isWriting){const img=model.media.find(m=>m.type==='image');out+=`<article class="question"><div class="qtop"><span>第 ${esc(id)} 题</span><span>${i+1}/${currentQuestions.length}</span></div><div class="qtext">${esc(q[1].replace(/。[^。]*$/,"。"))}</div>${renderGuidedWritingWords(q)}${img?`<div class="writingImageWrap"><img class="writingImage" src="${esc(img.source)}" alt="Gambar soal ${esc(id)}" loading="lazy" decoding="async"></div>`:''}${renderWordBank(q,id)}<textarea class="write writingAnswerField" id="w${id}" placeholder="Ketik jawaban di sini" autocomplete="off" rows="1" oninput="saveWriting(this);autoGrowWriting(this)" onfocus="autoGrowWriting(this)">${esc(answers[id]||'')}</textarea><div class="writingDisclaimer">💡 Jawaban membuat kalimat dapat memiliki banyak bentuk yang benar. Jawaban ini tidak dinilai benar atau salah secara otomatis. Periksa kembali penggunaan kata dan tata bahasa kalimatmu.</div><div class="row"><button class="btn soft" onclick="checkOne('${id}')">${svg('check')} Periksa</button><button class="btn" onclick="showReference('${id}')">Lihat contoh jawaban</button></div><div class="feedback" id="f${id}"></div><div class="reference" id="r${id}">Contoh jawaban: ${esc(q[2]||'Tidak tersedia')}</div></article>`;return}const gid=model.group?.id;if(gid&&gid!==lastPassage){out+=renderReadingPassage(gid);lastPassage=gid}else if(!gid&&route.type==='reading'&&!getPackageEngineRules(pkg)&&!isSequenceReadingQuestion(id)){const legacyPassage=renderReadingPassage(id);if(legacyPassage){out+=legacyPassage;lastPassage=id}}const labels=model.options.map((o,oi)=>{const selected=Number(answers[id])===oi;const state=checked[id]?(isCorrect(q,answers[id],route.type,route.sectionIndex)?'correct':'wrong'):'';return `<button type="button" class="opt ${selected?'selected':''} ${state}" data-q="${esc(id)}" data-i="${oi}" onclick="choose(this)"><span class="optText">${o.label}. ${esc(o.value)}</span></button>`}).join('');const img=model.media.find(m=>m.type==='image');const hsk5ChoiceClass=isHsk5Model(pkg)&&model.type==='choice'?' hsk5ChoiceOpts':'';out+=`<article class="question"><div class="qtop"><span>第 ${esc(id)} 题</span><span>${i+1}/${currentQuestions.length}</span></div><div class="qtext">${esc(q[1])}</div>${img?`<div class="questionMedia"><img src="${esc(img.source)}" alt="Gambar soal ${esc(id)}" loading="lazy" decoding="async"></div>`:''}<div class="opts${hsk5ChoiceClass}">${labels}</div><div class="row"><button class="btn soft" onclick="checkOne('${id}')">${svg('check')} Periksa</button>${route.type==='listening'?`<button class="btn" type="button" onclick="toggleTranscript('${id}')">Lihat teks</button>`:''}</div>${route.type==='listening'?`<div class="transcript" id="t${id}">${esc(q[4]||'Teks dengar tidak tersedia di sumber.')}</div>`:''}<div class="feedback" id="f${id}"></div></article>`});return out}
function getHsk5PassageMedia(pkg,gid){
  const root=pkg?.reading_passage_media?.[pkg.code]||pkg?.reading_passage_media?.[String(pkg.code)]||{};
  const item=root?.[String(gid)];
  const images=Array.isArray(item?.images)?item.images:[];
  return images.filter(src=>typeof src==='string'&&src.trim()).map((src,i)=>({source:src,alt:'Gambar teks bacaan '+String(gid)+(images.length>1?' '+(i+1):'')}));
}
function hsk5ReadingPart(qs){
  const ids=qs.map(q=>Number(q?.[0])).filter(Number.isFinite);
  if(!ids.length)return null;
  const min=Math.min(...ids),max=Math.max(...ids);
  if(min>=46&&max<=60)return 'part1';
  if(min>=61&&max<=70)return 'part2';
  if(min>=71&&max<=90)return 'part3';
  return null;
}
function hsk5PaperOptionButtons(pkg,q,extraClass=''){
  const id=String(q[0]);
  const model=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
  return model.options.map((o,oi)=>{
    const selected=Number(answers[id])===oi;
    const state=checked[id]?(isCorrect(q,answers[id],route.type,route.sectionIndex)?'correct':'wrong'):'';
    return '<button type="button" class="opt hsk5PaperOption '+extraClass+' '+(selected?'selected ':'')+state+'" data-q="'+esc(id)+'" data-i="'+oi+'" onclick="choose(this)"><span class="optText">'+o.label+'. '+esc(o.value)+'</span></button>';
  }).join('');
}
function hsk5PaperActions(id){
  return '<div class="hsk5PaperActions"><button type="button" class="btn soft" onclick="checkOne(\''+esc(id)+'\');return false;">'+svg('check')+' Periksa</button></div><div class="feedback hsk5PaperFeedback" id="f'+esc(id)+'"></div>';
}
function hsk5PaperGroupRange(qs){
  const ids=qs.map(q=>String(q?.[0]??'')).filter(Boolean);
  return ids.length?ids[0]+(ids.length>1?'–'+ids[ids.length-1]:''):'';
}
function isHsk4PaperReading(pkg){
  const code=String(pkg?.code||route?.packageCode||'');
  return route?.type==='reading'&&!isHsk5Model(pkg)&&(Number(pkg?.level)===4||/^H4\d{3,}/.test(code)||/^HSK4/.test(code));
}
function hsk4PaperPart(qs){
  const ids=qs.map(q=>Number(q?.[0])).filter(Number.isFinite);
  if(!ids.length)return null;
  const min=Math.min(...ids),max=Math.max(...ids);
  if(min>=46&&max<=50)return 'part1';
  if(min>=51&&max<=55)return 'part2';
  if(min>=56&&max<=65)return 'part3';
  if(min>=66&&max<=85)return 'part4';
  return null;
}
function hsk4PaperHeaderHTML(idx){
  const parts=[
    {title:'第一部分',range:'46–50',instruction:'选词填空。'},
    {title:'第二部分',range:'51–55',instruction:'选词填空。'},
    {title:'第三部分',range:'56–65',instruction:'请排列下列句子的正确顺序。'},
    {title:'第四部分',range:'66–85',instruction:'请选出正确答案。'}
  ];
  const part=parts[Number(idx)]||parts[0];
  return (Number(idx)===0?'<span class="hsk4PaperOverallTitle">二、阅读</span>':'')+'<span class="hsk5PaperSectionTitle">'+part.title+'</span><span class="hsk5PaperSectionInstruction">第 '+part.range+' 题：'+part.instruction+'</span>';
}
function hsk4PaperWordBank(pkg,q){
  const model=getResolvedQuestionModel(pkg,'reading',route.sectionIndex,q);
  return '<div class="hsk4PaperWordBank" aria-label="Pilihan kata">'+model.options.map(o=>'<span class="hsk4PaperWord"><b>'+o.label+'</b> '+esc(o.value)+'</span>').join('')+'</div>';
}
function hsk4PaperClozePart(pkg,qs,part){
  if(!qs.length)return '';
  const bank=hsk4PaperWordBank(pkg,qs[0]);
  const body=qs.map(q=>{
    const id=String(q[0]);
    const prompt=String(q[1]||'').replace(/\s+B:/g,'\nB:');
    return '<div class="hsk5PaperQuestion hsk4PaperClozeQuestion"><div class="hsk5PaperQNo">'+esc(id)+'.</div><div class="hsk5PaperQBody"><div class="hsk5PaperQText">'+esc(prompt)+'</div><div class="hsk5PaperOptions hsk4PaperClozeOptions">'+hsk5PaperOptionButtons(pkg,q)+'</div>'+hsk5PaperActions(id)+'</div></div>';
  }).join('');
  return '<section class="hsk5PaperGroup hsk4PaperPart '+part+'">'+bank+body+'</section>';
}
function hsk4PaperPart3(pkg,qs){
  return '<section class="hsk5PaperGroup hsk4PaperPart hsk4PaperPart3">'+qs.map((q,i)=>{
    const id=String(q[0]);
    const lines=(Array.isArray(q[2])?q[2]:[]).map((text,index)=>'<div class="hsk4PaperSentenceLine"><b>'+String.fromCharCode(65+index)+'.</b><span>'+esc(text)+'</span></div>').join('');
    const input='<div class="hsk4PaperSequenceResponse"><label for="w'+esc(id)+'">Urutan kalimat</label><input class="write writingAnswerField hsk4PaperSequenceInput" id="w'+esc(id)+'" type="text" value="'+esc(answers[id]||'')+'" placeholder="ABC" autocomplete="off" oninput="saveWriting(this)"></div>';
    const actions='<div class="hsk5PaperActions"><button type="button" class="btn soft" onclick="checkOne(\''+esc(id)+'\');return false;">'+svg('check')+' Periksa</button><button type="button" class="btn" onclick="showReference(\''+esc(id)+'\')">Lihat kunci</button></div><div class="feedback hsk5PaperFeedback" id="f'+esc(id)+'"></div><div class="reference" id="r'+esc(id)+'">Kunci jawaban: '+esc(q[3]||'Tidak tersedia')+'</div>';
    return '<div class="hsk5PaperQuestion hsk4PaperSequenceQuestion"><div class="hsk5PaperQNo">'+esc(id)+'.</div><div class="hsk5PaperQBody"><div class="hsk4PaperSentenceList">'+lines+'</div>'+input+actions+'</div></div>';
  }).join('')+'</section>';
}
function hsk4PaperPassageKey(pkg,q){
  const model=getResolvedQuestionModel(pkg,'reading',route.sectionIndex,q);
  if(model.group?.id)return String(model.group.id);
  const code=String(pkg?.code||route.packageCode||'');
  const map=pkg?.reading_passages?.[code]||pkg?.reading_passages?.[String(code)]||READING_PASSAGES?.[code]||{};
  const id=Number(q?.[0]);
  for(const key of Object.keys(map)){
    if(String(key)===String(q?.[0]))return String(key);
    const match=/^(\d+)\s*[-–—]\s*(\d+)$/.exec(String(key));
    if(match&&id>=Number(match[1])&&id<=Number(match[2]))return String(key);
  }
  return '';
}
function renderHsk4PaperPart4(pkg,qs){
  const map=pkg?.reading_passages?.[pkg.code]||pkg?.reading_passages?.[String(pkg.code)]||READING_PASSAGES?.[pkg.code]||{};
  const groups=[];let current=null;
  for(const q of qs){
    const id=String(q[0]),key=hsk4PaperPassageKey(pkg,q);
    const groupKey=key||'question-'+id;
    if(!current||current.key!==groupKey){current={key:groupKey,passageKey:key,qs:[]};groups.push(current)}
    current.qs.push(q);
  }
  return groups.map(group=>{
    const passageText=group.passageKey?String(map[group.passageKey]||''):'';
    const media=group.passageKey&&typeof getHsk5PassageMedia==='function'?getHsk5PassageMedia(pkg,group.passageKey):[];
    const mediaHtml=media.length?'<div class="hsk5PaperPart3Media">'+media.map(m=>'<img src="'+esc(m.source)+'" alt="'+esc(m.alt)+'" loading="lazy" decoding="async">').join('')+'</div>':'';
    const header=group.passageKey?'<div class="hsk5PaperGroupHeader">'+esc(group.passageKey.replace(/-/g,'–'))+'．</div>':'';
    const passage=passageText?'<div class="hsk5PaperPassage hsk5PaperPart3PassageText">'+mediaHtml+'<div class="hsk5PaperPassageText">'+esc(passageText)+'</div></div>':'';
    const body=group.qs.map(q=>{
      const id=String(q[0]);
      const qText='<div class="hsk5PaperQText"><span aria-hidden="true" class="hsk4PaperStar">★</span> '+esc(q[1])+'</div>';
      const model=getResolvedQuestionModel(pkg,'reading',route.sectionIndex,q);
      const needsTwoRows=model.options.some(o=>{const s=String(o.label||'')+' '+String(o.value||'');return (s.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)||[]).length>=4});
      const options='<div class="hsk5PaperOptions'+(needsTwoRows?' paperOptionsTwoRows':'')+'">'+hsk5PaperOptionButtons(pkg,q)+'</div>';
      return '<div class="hsk5PaperQuestion hsk4PaperChoiceQuestion">'+qText+options+hsk5PaperActions(id)+'</div>';
    }).join('');
    return '<section class="hsk5PaperGroup hsk4PaperPart hsk4PaperPart4">'+header+passage+body+'</section>';
  }).join('');
}
function renderHsk4PaperExperience(pkg,qs){
  const part=hsk4PaperPart(qs);
  if(part==='part1')return hsk4PaperClozePart(pkg,qs,'hsk4PaperPart1');
  if(part==='part2')return hsk4PaperClozePart(pkg,qs,'hsk4PaperPart2');
  if(part==='part3')return hsk4PaperPart3(pkg,qs);
  if(part==='part4')return renderHsk4PaperPart4(pkg,qs);
  return renderStandardQuestionCards();
}
function renderHsk5PaperPart1(pkg,qs){
  const root=pkg?.reading_passages?.[pkg.code]||pkg?.reading_passages?.[String(pkg.code)]||{};
  const groups=[];let current=null;
  for(const q of qs){
    const m=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q),gid=String(m.group?.id||'');
    if(!gid)continue;
    if(!current||current.id!==gid){current={id:gid,qs:[]};groups.push(current);}
    current.qs.push(q);
  }
  return groups.map(g=>{
    const text=String(root?.[g.id]||'');
    const passage='<div class="hsk5PaperGroupHeader">'+esc(g.id)+'．</div><div class="hsk5PaperPassage"><div class="hsk5PaperPassageText">'+esc(text)+'</div></div>';
    const body=g.qs.map(q=>{
      const id=String(q[0]);
      const model=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
      const needsTwoRows=model.options.some(o=>{
        const text=String(o.label||'')+' '+String(o.value||'');
        const hanzi=(text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)||[]).length;
        return hanzi>=4;
      });
      const optionClass=needsTwoRows?' paperOptionsTwoRows':'';
      return '<div class="hsk5PaperQuestion"><div class="hsk5PaperQText"><span class="paperQNo">'+esc(id)+'．</span></div><div class="hsk5PaperOptions'+optionClass+'">'+hsk5PaperOptionButtons(pkg,q)+'</div>'+hsk5PaperActions(id)+'</div>';
    }).join('');
    return '<section class="hsk5PaperGroup hsk5PaperPart1">'+passage+body+'</section>';
  }).join('');
}
function renderHsk5PaperPart2(pkg,qs){
  return '<section class="hsk5PaperGroup hsk5PaperPart2">'+qs.map(q=>{
    const id=String(q[0]);
    return '<div class="hsk5PaperQuestion"><div class="hsk5PaperQNo">'+esc(id)+'.</div><div class="hsk5PaperQBody"><div class="hsk5PaperQText">'+esc(q[1])+'</div><div class="hsk5PaperOptions">'+hsk5PaperOptionButtons(pkg,q)+'</div>'+hsk5PaperActions(id)+'</div></div>';
  }).join('')+'</section>';
}
function renderHsk5PaperPart3(pkg,qs){
  const root=pkg?.reading_passages?.[pkg.code]||pkg?.reading_passages?.[String(pkg.code)]||{};
  const groups=[];let current=null;
  for(const q of qs){
    const m=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q),gid=String(m.group?.id||'');
    if(!gid)continue;
    if(!current||current.id!==gid){current={id:gid,qs:[]};groups.push(current);}
    current.qs.push(q);
  }
  return groups.map(g=>{
    const text=String(root?.[g.id]||'');
    const media=getHsk5PassageMedia(pkg,g.id);
    const mediaHtml=media.length?'<div class="hsk5PaperPart3Media">'+media.map(m=>'<img src="'+esc(m.source)+'" alt="'+esc(m.alt)+'" loading="lazy" decoding="async">').join('')+'</div>':'';
    const passage='<div class="hsk5PaperGroupHeader">'+esc(g.id)+'．</div><div class="hsk5PaperPassage hsk5PaperPart3PassageText">'+mediaHtml+'<div class="hsk5PaperPassageText">'+esc(text)+'</div></div>';
    const body=g.qs.map(q=>{
      const id=String(q[0]);
      const model=getResolvedQuestionModel(pkg,route.type,route.sectionIndex,q);
      const needsTwoRows=model.options.some(o=>{
        const text=String(o.label||'')+' '+String(o.value||'');
        const hanzi=(text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)||[]).length;
        return hanzi>=4;
      });
      const optionClass=needsTwoRows?' paperOptionsTwoRows':'';
      return '<div class="hsk5PaperQuestion"><div class="hsk5PaperQText"><span class="paperQNo">'+esc(id)+'.</span> '+esc(q[1])+'</div><div class="hsk5PaperOptions'+optionClass+'">'+hsk5PaperOptionButtons(pkg,q)+'</div>'+hsk5PaperActions(id)+'</div>';
    }).join('');
    return '<section class="hsk5PaperGroup hsk5PaperPart3">'+passage+body+'</section>';
  }).join('');
}
function renderHsk5PaperExperience(pkg,qs){
  const part=hsk5ReadingPart(qs);
  if(part==='part1')return renderHsk5PaperPart1(pkg,qs);
  if(part==='part2')return renderHsk5PaperPart2(pkg,qs);
  if(part==='part3')return renderHsk5PaperPart3(pkg,qs);
  return renderStandardQuestionCards();
}
function renderQuestionCards(){
  const pkg=getActivePackageData();
  if(isHsk4PaperReading(pkg)) return renderHsk4PaperExperience(pkg,currentQuestions);
  if(isHsk5Model(pkg) && route.type==='reading') return renderHsk5PaperExperience(pkg,currentQuestions);
  return renderStandardQuestionCards();
}

let hsk5PaperResizeTimer=null;
window.addEventListener('resize',()=>{clearTimeout(hsk5PaperResizeTimer);hsk5PaperResizeTimer=setTimeout(scheduleHsk5AutoPaperOptionLayout,80)});
function restoreQuestionUI(){for(const q of currentQuestions){const id=String(q[0]);if(currentMode==='writing'){const e=$('w'+id);if(e){e.value=answers[id]??'';if(typeof autoGrowWriting==='function')requestAnimationFrame(()=>autoGrowWriting(e))}}else if(answers[id]!==undefined){const b=document.querySelector(`.opt[data-q="${id}"][data-i="${answers[id]}"]`);if(b)b.classList.add('selected')}if(checked[id])checkOne(id,true,true)}}
function autoGrowWriting(el){if(!el||!el.classList?.contains('writingAnswerField'))return;el.style.height='auto';const cs=getComputedStyle(el);const min=parseFloat(cs.minHeight)||0;const max=parseFloat(cs.maxHeight)||Infinity;const h=Math.max(el.scrollHeight,min);el.style.height=Math.min(h,max)+'px';el.style.overflowY=h>max?'auto':'hidden'}
function saveWriting(el){const id=String(el.id).slice(1);resumeQuestionId=id;const previous=answers[id];answers[id]=el.value;checked[id]=false;if(String(el.value||'').trim()!==''&&(previous===undefined||String(previous)!==String(el.value))){if(!answerEvents[id])answerEvents[id]=createQuestionActivity(id);}const f=$('f'+id);if(f)f.className='feedback';saveSectionState(route.packageCode,route.type,route.sectionIndex,answers,checked,answerEvents);refreshCurrentProgress()}
function refreshCurrentProgress(){const wrap=document.querySelector('.sectionProgress');if(!wrap)return;const st=sectionStats(route.packageCode,route.type,route.sectionIndex);const meta=wrap.querySelector('.progressMeta');if(meta)meta.innerHTML=`<strong>Progres bagian</strong><span>${st.answered}/${st.total} terjawab · ${st.pct}%</span>`;const fill=wrap.querySelector('.fill');if(fill)fill.style.width=st.pct+'%'}
function choose(btn){let id=String(btn.dataset.q);resumeQuestionId=id;resultState=null;const previous=answers[id];const next=btn.dataset.i;const changed=previous===undefined||String(previous)!==String(next);answers[id]=next;checked[id]=false;if(changed){answerEvents[id]=createQuestionActivity(id);}document.querySelectorAll(`.opt[data-q="${id}"],.hsk5ClozeOpt[data-q="${id}"]`).forEach(x=>x.classList.remove('selected','correct','wrong'));btn.classList.add('selected');let f=$('f'+id);if(f)f.className='feedback';saveSectionState(route.packageCode,route.type,route.sectionIndex);refreshCurrentProgress()}
function permutations(){return ['ABC','ACB','BAC','BCA','CAB','CBA']}
function escapeSequence(o,idx){let text=String(o);let m=text.match(/^([ABC])\s+(.*)$/);if(m)text=m[2];let label=['A','B','C'][idx]||'';return '<div class="sequenceLine"><b>'+label+'</b><span>'+esc(text)+'</span></div>'}
function saveWritingAnswer(id){resultState=null;const e=$('w'+id);const v=e?e.value.trim():String(answers[id]??'');if(!v){appNotice('Jawaban belum diisi','Ketik jawaban terlebih dahulu.');return}const previous=answers[id];const changed=previous===undefined||String(previous)!==String(v);answers[id]=v;if(changed){answerEvents[id]=createQuestionActivity(id);}checked[id]=true;const f=$('f'+id);if(f){f.className='feedback show good';f.textContent='✓ Jawaban tersimpan. Silakan periksa kembali kalimatmu sendiri.'}saveSectionState(route.packageCode,route.type,route.sectionIndex,answers,checked,answerEvents);refreshCurrentProgress()}


function checkOne(id,silent=false,restoreOnly=false){const q=currentQuestions.find(x=>String(x[0])===String(id))||((DB[route?.packageCode]?.[route?.type]?.[route?.sectionIndex]?.questions)||[]).find(x=>String(x[0])===String(id));if(!q)return;const model=getResolvedQuestionModel(getActivePackageData(),route.type,route.sectionIndex,q);
if(model.type==="sentence_ordering"||model.type==="sequence"){const e=$('w'+id);const v=e?e.value.trim():String(answers[id]??'');if(!v){if(!silent)appNotice('Jawaban belum dipilih','Pilih atau ketik susunan jawaban terlebih dahulu.');return}answers[id]=v;const ok=isSequenceAnswerCorrect(q,v);checked[id]=true;const f=$('f'+id);if(f){f.className='feedback show '+(ok?'good':'bad');f.textContent=ok?'Benar':'Salah — periksa kembali urutan kata atau lihat kunci jawaban.'}const input=$('w'+id);if(input){input.classList.remove('answer-correct','answer-wrong');input.classList.add(ok?'answer-correct':'answer-wrong')}if(!restoreOnly){saveSectionState(route.packageCode,route.type,route.sectionIndex);recordQuestionAttempt(id,ok);refreshCurrentProgress()}return}
if(model.type==="guided_writing"||model.type==="picture_writing"){if(restoreOnly){const f=$('f'+id);if(f&&String(answers[id]??'').trim()){f.className='feedback show good';f.textContent='✓ Jawaban tersimpan. Silakan periksa kembali kalimatmu sendiri.'}return}saveWritingAnswer(id);return}
if(answers[id]===undefined){const selectedOption=Array.from(document.querySelectorAll('.opt[data-q]')).find(el=>String(el.dataset.q)===String(id)&&el.classList.contains('selected'));if(selectedOption)answers[id]=selectedOption.dataset.i}if(answers[id]===undefined){if(!silent)appNotice('Jawaban belum dipilih','Pilih jawaban terlebih dahulu.');return}const ci=correctIndex(q,route.type),chosen=Number(answers[id]),ok=chosen===ci;checked[id]=true;const correctModel=getResolvedQuestionModel(getActivePackageData(),route.type,route.sectionIndex,q);const correctOpt=correctModel.options?.[ci];const answerLabel=correctOpt?String(correctOpt.value):(/^[A-F]$/i.test(String(q?.[3]??'').trim())?String(q[3]).trim().toUpperCase():'Tidak tersedia');const f=$('f'+id);if(f){f.className='feedback show '+(ok?'good':'bad');f.textContent=ok?'Benar':'Salah — jawaban yang benar: '+answerLabel}document.querySelectorAll(`.opt[data-q="${id}"],.hsk5ClozeOpt[data-q="${id}"]`).forEach(b=>{b.classList.remove('selected','correct','wrong');const i=Number(b.dataset.i);if(i===chosen)b.classList.add(ok?'correct':'wrong')});if(!restoreOnly){saveSectionState(route.packageCode,route.type,route.sectionIndex);recordQuestionAttempt(id,ok);refreshCurrentProgress()}}
function repeatOne(id){const q=currentQuestions.find(x=>String(x[0])===String(id));if(!q)return;resumeQuestionId=String(id);delete answers[id];delete checked[id];delete answerEvents[String(id)];if(currentMode==='writing'){const e=$('w'+id);if(e){e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));}if(isSequenceWriting(route.type,route.sectionIndex))refreshWordBank(id)}else{document.querySelectorAll(`.opt[data-q="${id}"]`).forEach(b=>b.classList.remove('selected','correct','wrong'));}const f=$('f'+id);if(f)f.className='feedback';const r=$('r'+id);if(r)r.className='reference';const t=$('t'+id);if(t)t.classList.remove('show');saveSectionState(route.packageCode,route.type,route.sectionIndex);refreshCurrentProgress()}
function toggleTranscript(id){$('t'+id).classList.toggle('show')}
function showReference(id){$('r'+id).classList.toggle('show')}
function grade(push=true){
  if(!currentQuestions.length)return;
  let score=0,answered=0;
  currentQuestions.forEach(q=>{
    const id=String(q[0]);
    let u=answers[id];
    if(currentMode==='writing'){
      const e=$('w'+id);
      if(e){u=e.value.trim();answers[id]=u}
    }
    const has=u!==undefined&&String(u).trim()!=='';
    if(has)answered++;
    if(has && isCorrect(q,u,route.type,route.sectionIndex))score++;
    /* Checked state belongs to the exercise itself. Never navigate to a Result screen. */
    if(has && !(route.type==='writing' && !isSequenceWriting(route.type,route.sectionIndex))) checked[id]=true;
  });
  saveSectionState(route.packageCode,route.type,route.sectionIndex);
  /* The explicit section check is the only action that writes progress to cloud. */
  syncAfterSectionCheck();
  resultState={score,total:currentQuestions.length,answered,checkedAt:Date.now()};
  /* Keep the exact exercise route. Assessment is now an inline state. */
  route={...route,screen:'exercise'};
  loadCurrentSectionState();
  resultState={score,total:currentQuestions.length,answered,checkedAt:Date.now()};
  renderExercise();
  setScreen('exercise',false);
  // After checking the section, bring the assessment card into view.
  // Keep the sticky top bar clear so the score is immediately visible.
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const assessment=document.querySelector('#exercise .finishCard.checked');
      if(!assessment)return;
      const top=assessment.getBoundingClientRect().top+window.scrollY-78;
      window.scrollTo({top:Math.max(0,top),left:0,behavior:'auto'});
    });
  });
}
function renderResult(){let r=resultState||{score:0,total:currentQuestions.length,answered:0};const rp=$('resultPkg'),rt=$('resultType'),rpart=$('resultPart');if(rp)rp.textContent=route.packageCode;if(rt)rt.textContent=META[route.type]?.label||route.type;if(rpart)rpart.textContent='Hasil · '+((DB[route.packageCode]?.[route.type]?.[route.sectionIndex]?.title||'').replace(/^.*?·\s*/,''));const isWriting=route.type==='writing',sequenceWriting=isSequenceWriting(route.type,route.sectionIndex);let pct=r.total?Math.round(r.score/r.total*100):0;const summary=(isWriting&&!sequenceWriting)?`<p><b>${r.answered}/${r.total}</b> jawaban tersimpan.</p><div class="notice" style="text-align:left;margin-top:16px"><strong>Catatan Writing</strong><br>Jawaban membuat kalimat tidak dinilai benar atau salah secara otomatis. Periksa kembali penggunaan kata dan tata bahasa kalimatmu.</div>`:`<div class="score">${pct}%</div><div class="bar"><div class="fill" style="width:${pct}%"></div></div><p><b>${r.score}/${r.total}</b> benar · ${r.answered} dijawab · ${r.total-r.answered} belum dijawab</p>`;$('resultBody').innerHTML=`<div class="result"><div class="sub">${esc(DB[route.packageCode][route.type][route.sectionIndex]?.title||'Hasil')}</div>${summary}<div class="resultActions"><button class="btn soft" onclick="repeat()">↻ Ulangi</button><button class="btn" onclick="openSections('${route.packageCode}','${route.type}')">${svg('back')} Kembali</button></div></div>`}
function repeat(){if(!route.packageCode)return;appConfirm('Ulangi bagian ini?','Semua jawaban pada bagian ini akan dihapus dan kamu akan mulai lagi dari awal.',()=>{clearSectionState(route.packageCode,route.type,route.sectionIndex);resultState=null;page=0;window.__hskResumePage=0;route.screen='exercise';loadCurrentSectionState();renderExercise();setScreen('exercise',false);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'})))},{icon:'↻',okText:'Ulangi',danger:true})}
function showPackageScore(code){const st=packageStats(code);$('packageModalTitle').textContent='Nilai Paket '+code;let rows=st.rows.map(r=>{if(!r.graded)return `<div class="scoreRow"><div class="scoreHead"><span>${esc(r.zh)} · ${esc(r.section)}</span><span>—</span></div><div class="scoreSub">Soal ${esc(r.range)} · ${r.answered}/${r.total} terjawab · Tidak dinilai otomatis</div></div>`;const pct=r.total?Math.round(r.score/r.total*100):0;return `<div class="scoreRow"><div class="scoreHead"><span>${esc(r.zh)} · ${esc(r.section)}</span><span>${r.score}/${r.total} · ${pct}%</span></div><div class="scoreSub">Soal ${esc(r.range)} · ${r.answered}/${r.total} terjawab</div><div class="scoreMini"><i style="width:${pct}%"></i></div></div>`}).join('');$('packageModalBody').innerHTML=`<div class="modalNote">Nilai otomatis dihitung untuk pilihan ganda dan susun kata yang memiliki kunci jawaban. Soal membuat kalimat tetap tercatat sebagai progres, tetapi tidak dinilai benar/salah.</div><div class="packageScore">${st.gradedTotal?st.scorePct+'%':'—'}</div><div class="scoreSub">${st.gradedTotal?st.score+'/'+st.gradedTotal+' benar · ':''}${st.answered}/${st.total} terjawab</div><div style="margin:16px 0">${progressHTML(st,'Progres paket')}</div>${rows||'<div class="notice">Belum ada bagian soal yang tersedia.</div>'}`;$('packageModal').classList.add('show')}
function closePackageScore(){$('packageModal').classList.remove('show')}
function toggleTheme(){applyTheme(document.body.classList.contains('dark')?'light':'dark')}
function applyTheme(t){document.body.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('dark',t==='dark');const homeLogo=document.querySelector('#home .homeCornerLogo');const themeLogo=document.querySelector('.topBrandMark .hskThemeLogo'+(t==='dark'?'Dark':'Light'));if(homeLogo&&themeLogo&&themeLogo.src)homeLogo.src=themeLogo.src;const b=document.querySelector('.mainNav [data-nav="theme"]');if(b)b.innerHTML=(t==='dark'?'<svg aria-hidden="true" class="ico heroicon-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z"/></svg>':'<svg aria-hidden="true" class="ico heroicon-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd"/></svg>')+'<span class="navLabel">Tema</span>';document.querySelectorAll('.exerciseThemeToggle').forEach(b=>{b.innerHTML=svg(t==='dark'?'sun':'moon');b.setAttribute('aria-label',t==='dark'?'Beralih ke tema terang':'Beralih ke tema gelap');b.title=t==='dark'?'Tema terang':'Tema gelap'});const at=document.getElementById('authThemeToggle');if(at){at.innerHTML='<span aria-hidden="true" class="material-symbols-rounded">'+(t==='dark'?'light_mode':'dark_mode')+'</span>';at.setAttribute('aria-label',t==='dark'?'Beralih ke tema terang':'Beralih ke tema gelap');at.title=t==='dark'?'Tema terang':'Tema gelap';}document.querySelector('meta[name="theme-color"]').content=t==='dark'?'#000000':'#f4f5fb';localStorage.setItem('hsk-theme',t);if(typeof route!=='undefined'&&route)renderNavState()}
function showExit(fromBack=false){if(!currentUsername)return;exitFromBack=fromBack;$('exitModal').classList.add('show')}function cancelExit(){$('exitModal').classList.remove('show');if(exitFromBack){exitFromBack=false;if(typeof window.__hskArmBackGuard==='function')window.__hskArmBackGuard()}}function confirmExit(){$('exitModal').classList.remove('show');exitFromBack=false;performLogout()}
let selectedHSKLevel=4;
function renderLevelsScreen(){const el=document.querySelector('#levelsScreen .levelGrid');if(!el)return;el.innerHTML=`<button class="levelCard levelCard4" type="button" onclick="openLevelPackages(4)"><div class="levelCardIcon">4</div><div class="levelCardBody"><span class="levelEyebrow">HSK LEVEL</span><strong>HSK 4</strong><p>25 paket latihan tersedia</p></div><span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span></button><button class="levelCard levelCard5" type="button" onclick="openLevelPackages(5)"><div class="levelCardIcon">5</div><div class="levelCardBody"><span class="levelEyebrow">HSK LEVEL</span><strong>HSK 5</strong><p>Paket tersedia dari database</p></div><span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span></button>`;}
function selectHSKLevel(level){openLevelPackages(level)}
function togglePackageSearch(){const wrap=$('packageSearchWrap'),btn=$('packageSearchToggle');if(!wrap||!btn)return;const show=wrap.hidden;wrap.hidden=!show;btn.setAttribute('aria-expanded',String(show));if(show){setTimeout(()=>$('packageSearchInput')?.focus(),40)}}
function openScores(push=true){route={screen:'scores',packageCode:null,type:null,sectionIndex:null};renderScores();setScreen('scores',push);window.scrollTo({top:0,left:0,behavior:'auto'})}
let selectedScoreLevel=4;
function renderScores(){
  const el=$('scoresGrid');if(!el)return;
  selectedScoreLevel=4;
  el.className='levelGrid scoreLevelGrid';
  el.innerHTML=`
    <button class="levelCard levelCard4 scoreLevelCard" type="button" onclick="openScoreLevel(4)">
      <div class="levelCardIcon">4</div>
      <div class="levelCardBody"><span class="levelEyebrow">HSK LEVEL</span><strong>HSK 4</strong><p>25 paket latihan tersedia</p></div>
      <span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span>
    </button>
    <button class="levelCard levelCard5 scoreLevelCard" type="button" onclick="openScoreLevel(5)">
      <div class="levelCardIcon">5</div>
      <div class="levelCardBody"><span class="levelEyebrow">HSK LEVEL</span><strong>HSK 5</strong><p>Coming soon · sedang dipersiapkan</p></div>
      <span class="levelCardArrow"><span class="material-symbols-rounded ico" aria-hidden="true">arrow_forward</span></span>
    </button>`;
}
function openScoreLevel(level){
  selectedScoreLevel=Number(level)===5?5:4;
  const el=$('scoresGrid');if(!el)return;
  if(selectedScoreLevel===5){
    el.className='scorePackagesView';
    el.innerHTML=`<div class="scoreBackRow"><button class="btn" type="button" onclick="renderScores()">← Kembali ke level</button></div><div class="scoreLevelTitle"><div class="sectionKicker">HSK 5</div><h3>Nilai HSK 5</h3><p>Belum ada paket yang tersedia.</p></div><div class="comingSoonPanel scoreComing"><div class="comingIcon">5</div><div><strong>HSK 5</strong><span>Belum dipilih</span><small>Daftar paket akan mengikuti database.</small></div></div>`;
    window.scrollTo({top:0,left:0,behavior:'smooth'});return;
  }
  const codes=Object.keys(DB).filter(c=>typeof isWB!=='function'||!isWB(c));
  const progressStore=readStore();
  el.className='grid scorePackagesGrid';
  const cards=codes.map((code,idx)=>{const st=packageStats(code,progressStore);const score=st.total?st.scorePct:0;const status=st.answered===0?'Belum dikerjakan':st.answered===st.total?'Selesai':'Sedang berjalan';const accent=['blue','purple','orange','pink','green'][idx%5];return `<button class="tile packageTile packageTile-${accent}" type="button" onclick="showPackageScore('${esc(code)}')"><div class="pkgTop"><div class="tileIcon" aria-hidden="true">${svg('chart')}</div><span class="statusPill">${status}</span></div><div class="pkgTitleRow"><div><b>Paket ${esc(code)}</b><small>${st.score}/${st.total} benar · ${st.answered}/${st.total} terjawab</small></div><span class="pkgArrow">${score}%</span></div>${progressHTML({answered:st.answered,total:st.total,pct:st.pct},'Progres pengerjaan')}<div class="pkgFooter"><span>Nilai paket</span><span>${score}%</span></div></button>`}).join('');
  el.innerHTML=`<div class="scoreBackRow"><button class="btn" type="button" onclick="renderScores()">← Kembali ke level</button></div><div class="scoreLevelTitle"><div class="sectionKicker">HSK 4</div><h3>Nilai HSK 4</h3><p>Pilih paket untuk melihat rincian nilainya.</p></div>${cards||'<div class="notice">Belum ada paket latihan.</div>'}`;
  window.scrollTo({top:0,left:0,behavior:'smooth'});
}
