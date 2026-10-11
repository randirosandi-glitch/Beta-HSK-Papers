(function(){
  'use strict';
  if(window.__hskAccuracyCleanInstalled)return;
  window.__hskAccuracyCleanInstalled=true;
  if(typeof packageStats==='function'&&!packageStats.__hskAccuracyCleanWrapped){
    const originalStats=packageStats;
    function fixedPackageStats(code){
      const pkg=DB?.[code];
      if(pkg?.__lazy){
        const meta=typeof lazyPackageMeta==='function'?lazyPackageMeta(code):null;
        const expected=Number(meta?.total)||0;
        const answeredRaw=typeof lazyStoredProgress==='function'?Number(lazyStoredProgress(code))||0:0;
        const answered=Math.min(answeredRaw,expected||answeredRaw);
        return {total:expected,answered,score:0,gradedTotal:0,pct:expected?Math.round(answered/expected*100):0,scorePct:0,rows:[]};
      }
      return originalStats(code);
    }
    fixedPackageStats.__hskAccuracyCleanWrapped=true;
    fixedPackageStats.__hskAccuracyCleanOriginal=originalStats;
    packageStats=fixedPackageStats;
    window.packageStats=fixedPackageStats;
  }
})();