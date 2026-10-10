/* Source module: section-answer persistence.
 * Preserve existing per-user store adapter, answer-event fallback, reset-tombstone
 * clearing, route-resume metadata, and cloud-sync scheduling.
 * Global declarations remain compatible with the legacy single-file runtime.
 */
function saveSectionState(code,type,idx,a=answers,c=checked,events=answerEvents){
  const st=readStore(); const now=Date.now(); const key=stateKey(code,type,idx); const prev=st[key]||{};
  if(st._progressResets&&typeof st._progressResets==='object'){
    delete st._progressResets[key];
    delete st._progressResets['_resume'];
    delete st._progressResets['package:'+String(code)];
    delete st._progressResets['section:'+String(code)+'|'+String(type)];
    if(!Object.keys(st._progressResets).length)delete st._progressResets;
  }
  st[key]={answers:{...a},checked:{...c},answerEvents:{...(events||prev.answerEvents||{})},updatedAt:now};
  if(route.screen==='exercise'&&route.packageCode===code&&route.type===type&&Number(route.sectionIndex)===Number(idx)){
    st._resume={code,type,sectionIndex:Number(idx),questionId:resumeQuestionId||null,page:Number(window.__hskResumePage||0),updatedAt:now};
  }
  writeStore(st); scheduleCloudSync();
}
function clearSectionState(code,type,idx){const st=readStore();delete st[stateKey(code,type,idx)];if(st._resume&&st._resume.code===code&&st._resume.type===type&&Number(st._resume.sectionIndex)===Number(idx))delete st._resume;writeStore(st);scheduleCloudSync()}
