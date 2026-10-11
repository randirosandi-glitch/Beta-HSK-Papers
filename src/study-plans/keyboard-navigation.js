(function(){
  'use strict';
  document.addEventListener('keydown',function(e){
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    const row=e.target.closest?.('#studyPlanPackages .studyPlanPackage');
    if(row && !e.target.closest('button') && (e.key==='Enter'||e.key===' ')){
      e.preventDefault();
      const id=row.dataset.planId,code=row.dataset.packageCode;
      if(id&&code&&typeof window.openPackageFromStudyPlan==='function')window.openPackageFromStudyPlan(id,code);
      return;
    }
    const card=e.target.closest?.('#studyPlansGrid .studyPlanCard[role="button"]');
    if(card && e.target===card && (e.key==='Enter'||e.key===' ')){
      e.preventDefault();
      if(typeof window.openStudyPlan==='function'&&card.dataset.planId)window.openStudyPlan(card.dataset.planId);
    }
  },true);
})();