/* Source module: question load recovery.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';
  function install(){
    if(typeof window.renderExercise!=='function'||window.renderExercise.__hskRecoveryHook)return;
    const original=window.renderExercise;
    function wrapped(){
      let out;
      try{out=original.apply(this,arguments);}
      catch(e){
        console.error('HSK exercise render failed:',e);
        window.showExerciseLoadRecovery?.('Soal belum berhasil dimuat','Terjadi masalah saat menampilkan soal. Refresh untuk mencoba memuat ulang data soal.');
        return undefined;
      }
      try{
        const r=window.route||{};
        if(r.screen!=='exercise')return out;
        const sec=window.DB?.[r.packageCode]?.[r.type]?.[r.sectionIndex];
        const qs=sec?.questions;
        if(!Array.isArray(qs)||qs.length===0){
          window.showExerciseLoadRecovery?.('Soal belum berhasil dimuat','Bagian ini terbuka, tetapi daftar soal masih kosong. Refresh untuk mencoba memuat ulang data soal.');
        }
      }catch(e){console.warn('HSK question recovery check:',e)}
      return out;
    }
    wrapped.__hskRecoveryHook=true;
    wrapped.__hskOriginal=original;
    window.renderExercise=wrapped;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('hsk:dynamic-catalog-ready',install,{once:true});
})();
