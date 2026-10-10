/* Source module: weekly dashboard.
 * Exact extraction from the prior inline script block.
 * Preserve execution order and legacy globals during this rebuild.
 */

(function(){
  'use strict';
  const TARGET=100;
  const DAY=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const skillLabel={listening:'Listening',reading:'Reading',writing:'Writing'};
  const isoDay=d=>{const x=new Date(Number(d)||d);return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime()};
  const mondayOf=d=>{const x=new Date(d);x.setHours(0,0,0,0);const day=x.getDay();x.setDate(x.getDate()+(day===0?-6:1-day));return x};
  const rangeFor=offset=>{const s=mondayOf(new Date());s.setDate(s.getDate()+offset*7);const e=new Date(s);e.setDate(e.getDate()+6);e.setHours(23,59,59,999);return {start:s,end:e}};
  function attempts(){try{const st=typeof readStore==='function'?readStore():{};return Array.isArray(st._attempts)?st._attempts.filter(x=>x&&Number(x.timestamp)>0):[]}catch(e){return[]}}
  function aggregate(range){
    const ev=attempts().filter(x=>Number(x.timestamp)>=range.start.getTime()&&Number(x.timestamp)<=range.end.getTime()).sort((a,b)=>Number(a.timestamp)-Number(b.timestamp));
    let answered=0,graded=0,score=0;const skill={listening:0,reading:0,writing:0},days=Array(7).fill(0);
    ev.forEach(e=>{answered++;if(e.correct===true||e.correct===false){graded++;if(e.correct===true)score++;}if(skill[e.type]!=null)skill[e.type]++;const d=new Date(Number(e.timestamp)),day=d.getDay(),idx=day===0?6:day-1;days[idx]++});
    return {answered,graded,score,skill,days,activeDays:days.filter(Boolean).length,accuracy:graded?Math.round(score/graded*100):null};
  }
  function fmtDate(d){return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(d)}
  function render(){
    if(typeof DB==='undefined'||!document.getElementById('weeklyDashboard'))return;
    const cur=rangeFor(0),prev=rangeFor(-1),a=aggregate(cur),p=aggregate(prev),pct=Math.min(100,Math.round(a.answered/TARGET*100));
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    const g=document.getElementById('homeGreeting');if(g)g.innerHTML='Halo, <b>'+esc(currentUsername||'—')+'</b>.';
    set('weekRangeLabel',fmtDate(cur.start)+' – '+fmtDate(cur.end));set('weekQuestionCount',a.answered.toLocaleString('id-ID'));set('weekTargetPct',pct+'%');set('weekTargetValue',TARGET);set('weekActiveDays',a.activeDays+'/7 hari');set('weekAccuracy',a.graded?a.accuracy+'%':'—');
    const fill=document.getElementById('weekTargetFill');if(fill)fill.style.width=pct+'%';
    const act=document.getElementById('weekActivity');if(act)act.innerHTML=DAY.map((n,i)=>{const h=a.answered?Math.round(a.days[i]/Math.max(...a.days,1)*100):0;return '<div class="weekDay"><div class="weekDayLabel">'+n+'</div><div class="weekDayBar"><div class="weekDayFill" style="height:'+h+'%"></div></div><div class="weekDayCount">'+a.days[i]+'</div></div>'}).join('');
    const skills=document.getElementById('weeklySkillRows');if(skills)skills.innerHTML=Object.keys(skillLabel).map(k=>{const v=a.skill[k]||0,width=a.answered?Math.round(v/a.answered*100):0;return '<div class="skillRow"><span class="skillName">'+skillLabel[k]+'</span><div class="skillTrack"><div class="skillFill" style="width:'+width+'%"></div></div><span class="skillValue">'+v+'</span></div>'}).join('');
    const targets=document.getElementById('weeklyTargets');if(targets)targets.innerHTML='<div class="weeklyTargetItem"><span>Soal</span><strong>'+a.answered+'/'+TARGET+'</strong><span class="'+(a.answered>=TARGET?'targetStatus':'targetPending')+'">'+(a.answered>=TARGET?'Target tercapai':'Tersisa '+Math.max(0,TARGET-a.answered)+' soal')+'</span></div><div class="weeklyTargetItem"><span>Hari latihan</span><strong>'+a.activeDays+'/3</strong><span class="'+(a.activeDays>=3?'targetStatus':'targetPending')+'">'+(a.activeDays>=3?'Target tercapai':'Tersisa '+Math.max(0,3-a.activeDays)+' hari')+'</span></div><div class="weeklyTargetItem"><span>Akurasi</span><strong>'+(a.graded?a.accuracy+'%':'—')+'</strong><span class="targetPending">Target 70%</span></div>';
    const perf=document.getElementById('weeklyPerformance');if(perf){const delta=(x,y)=>y?Math.round((x-y)/y*100):x?100:0,change=v=>v>0?'↑ '+v+'%':v<0?'↓ '+Math.abs(v)+'%':'Tidak berubah',point=(x,y)=>{if(x==null&&y==null)return 'Belum ada data';if(x==null)return 'Belum ada data';if(y==null)return x>0?'↑ '+x+' poin':'Tidak berubah';const d=x-y;return d>0?'↑ '+d+' poin':d<0?'↓ '+Math.abs(d)+' poin':'Tidak berubah'};perf.innerHTML='<div class="performanceItem"><span>Soal dikerjakan</span><strong>'+a.answered+'</strong><span>'+change(delta(a.answered,p.answered))+' dari minggu lalu ('+p.answered+')</span></div><div class="performanceItem"><span>Hari aktif</span><strong>'+a.activeDays+'</strong><span>'+change(delta(a.activeDays,p.activeDays))+' dari minggu lalu ('+p.activeDays+')</span></div><div class="performanceItem"><span>Akurasi</span><strong>'+(a.graded?a.accuracy+'%':'—')+'</strong><span>'+point(a.accuracy,p.accuracy)+' dari minggu lalu ('+(p.graded?p.accuracy+'%':'—')+')</span></div>'}
    renderPeriod('monthlyStats',false);renderPeriod('yearlyStats',true);
  }
  function renderPeriod(id,year){const el=document.getElementById(id);if(!el)return;const now=new Date(),ev=attempts().filter(e=>{const d=new Date(Number(e.timestamp));return year?d.getFullYear()===now.getFullYear():(d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth())}),days=new Set(ev.map(e=>isoDay(e.timestamp))).size;el.innerHTML='<div class="periodItem"><span>'+(year?'Tahun '+now.getFullYear():new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(now))+'</span><strong>'+ev.length+'</strong><small>soal dikerjakan</small></div><div class="periodItem"><span>Hari aktif</span><strong>'+days+'</strong><small>hari</small></div>'}
  window.toggleDashboardPeriod=function(id,btn){const panel=document.getElementById(id);if(!panel||!btn)return;const isOpen=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!isOpen));panel.hidden=isOpen;};
  window.__renderWeeklyDashboard=render;
  window.addEventListener('load',()=>setTimeout(render,0));
  const oldRender=window.renderHome;if(typeof oldRender==='function'){window.renderHome=function(){const r=oldRender.apply(this,arguments);render();return r}}
  window.addEventListener('hsk:progress-updated',render);
})();
