(function(){
  'use strict';
  const originalGrade=window.grade;
  if(typeof originalGrade!=='function'||window.__hskGradeLoadingInstalled)return;
  window.__hskGradeLoadingInstalled=true;
  let busy=false,overlay;
  function ensureOverlay(){
    if(overlay&&overlay.isConnected)return overlay;
    overlay=document.createElement('div');
    overlay.id='hskGradeLoading';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML='<div class="hskGradePanel"><div class="hskGradeSpinner" aria-hidden="true"></div><div class="hskGradeTitle">Memeriksa jawaban…</div><div class="hskGradeSub">Menghitung hasil bagian ini</div></div>';
    document.body.appendChild(overlay);
    return overlay;
  }
  window.grade=function(push=true){
    if(busy)return;
    busy=true;
    const started=performance.now();
    const layer=ensureOverlay();
    layer.classList.add('show');
    const button=document.querySelector('#exercise .finishCard button[onclick*="grade"],#exercise button[onclick*="grade"]');
    if(button){button.dataset.gradeWasDisabled=button.disabled?'1':'0';button.disabled=true;}
    requestAnimationFrame(function(){
      setTimeout(function(){
        try{
          originalGrade.call(window,push);
        }catch(err){
          console.error('HSK grade failed',err);
        }finally{
          const elapsed=performance.now()-started;
          const wait=Math.max(0,220-elapsed);
          setTimeout(function(){
            layer.classList.remove('show');
            if(button&&button.isConnected){button.disabled=button.dataset.gradeWasDisabled==='1';delete button.dataset.gradeWasDisabled;}
            busy=false;
          },wait);
        }
      },20);
    });
  };
})();