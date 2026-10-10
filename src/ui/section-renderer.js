/* Source module: section renderer.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';
  const escFinal=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderSectionsFinalV23(){
    const d=DB[route.packageCode]?.[route.type]||[];
    const m=META[route.type];
    if(!m){goHome(false);return;}
    $('partsPkg').textContent=route.packageCode;
    $('partsCrumb').textContent=m.label;
    /* Split Hanzi and Latin so only the Chinese title receives Ma Shan Zheng. */
    $('partsTitle').innerHTML='<span class="partsTitleHanzi">'+escFinal(m.zh)+'</span><span aria-hidden="true"> · </span>'+escFinal(m.label);
    const available=d.map((s,i)=>({s,i})).filter(x=>Array.isArray(x.s.questions)&&x.s.questions.length>0);
    const arr=available.map(({s,i})=>{
      const st=sectionStats(route.packageCode,route.type,i);
      const sectionName=String(s.title||'').replace(/^.*?·\s*/,'');
      return '<button class="tile sectionPartTile" onclick="startSection('+i+')">'
        +'<div class="sectionPartTitle">'+escFinal(sectionName)+'</div>'
        +'<small>Soal '+escFinal(s.range)+' · '+s.questions.length+' soal</small>'
        +progressHTML(st,'Progres bagian')
        +'</button>';
    });
    $('sections').innerHTML=arr.length?arr.join(''):'<div class="notice"><strong>'+escFinal(route.packageCode)+' · '+escFinal(m.label)+'</strong><br>Bagian ini belum tersedia sebagai teks soal pada paket ini.</div>';
  }
  window.renderSections=renderSectionsFinalV23;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{try{if(route&&route.screen==='parts') renderSectionsFinalV23();}catch(e){}});
  else {try{if(route&&route.screen==='parts') renderSectionsFinalV23();}catch(e){}}
})();
