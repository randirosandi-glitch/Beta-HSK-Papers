/* Source module: parts renderer.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';
  const escV17=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hanziByType={listening:'听',reading:'读',writing:'写'};
  function renderSectionsV17(){
    const d=DB[route.packageCode]?.[route.type]||[];
    const m=META[route.type];
    if(!m){goHome(false);return;}
    $('partsPkg').textContent=route.packageCode;
    $('partsCrumb').textContent=m.label;
    $('partsTitle').textContent=m.zh+' · '+m.label;
    const hanzi=hanziByType[route.type]||String(m.zh||'练').trim().charAt(0)||'练';
    const available=d.map((s,i)=>({s,i})).filter(x=>Array.isArray(x.s.questions)&&x.s.questions.length>0);
    $('sections').innerHTML=available.length ? available.map(({s,i})=>{
      const st=sectionStats(route.packageCode,route.type,i);
      return `<button class="tile" style="--accent:${i%4===0?'#ff6548':i%4===1?'#19b8c8':i%4===2?'#7650dc':'#ed8a24'}" onclick="startSection(${i})">
        <div class="tileIcon" data-hanzi="${hanzi}" aria-hidden="true"></div>
        <b>${escV17(s.title.replace(/^.*?·\s*/,''))}</b>
        <small>Soal ${escV17(s.range)} · ${s.questions.length} soal</small>
        ${progressHTML(st,'Progres bagian')}
      </button>`;
    }).join('') : `<div class="notice"><strong>${route.packageCode} · ${m.label}</strong><br>Bagian ini belum tersedia sebagai teks soal pada paket ini.</div>`;
  }
  window.renderSections=renderSectionsV17;
})();
