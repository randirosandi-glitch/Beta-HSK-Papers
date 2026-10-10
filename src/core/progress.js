/* Source module: progress and activity-history model.
 * Compatibility contract: preserve the existing store schema, global function names,
 * local/cloud merge behavior, reset tombstones, and 5,000-event retention policy.
 * Classic-script declarations intentionally remain global for legacy callers.
 */
function progressResetAt(store,key){
  const rm=store&&typeof store._progressResets==='object'&&store._progressResets?store._progressResets:{};
  let at=Number(rm[key]||0)||0;
  for(const [scope,stamp] of Object.entries(rm)){
    const t=Number(stamp)||0;
    if(!t)continue;
    if(scope.startsWith('package:')&&key.startsWith(scope.slice(8)+'|'))at=Math.max(at,t);
    else if(scope.startsWith('section:')&&key.startsWith(scope.slice(8)+'|'))at=Math.max(at,t);
  }
  return at;
}
function resetCoversResume(store,resume){
  const rm=store&&typeof store._progressResets==='object'&&store._progressResets?store._progressResets:{};
  if(!resume||typeof resume!=='object')return 0;
  const code=String(resume.code||'');
  const type=String(resume.type||'');
  let at=Number(rm['_resume']||0)||0;
  for(const [scope,stamp] of Object.entries(rm)){
    const t=Number(stamp)||0;if(!t)continue;
    if(scope==='package:'+code||scope==='section:'+code+'|'+type)at=Math.max(at,t);
  }
  return at;
}
function mergeStoresLatest(local,remote){
  const a=local&&typeof local==='object'?local:{}; const b=remote&&typeof remote==='object'?remote:{};
  const out={...b}; let localWon=false;
  const localActivityAt=Number(a._lastActivity?.updatedAt||a._lastActivity?.timestamp||0);
  const remoteActivityAt=Number(b._lastActivity?.updatedAt||b._lastActivity?.timestamp||0);
  const resetA=a._progressResets&&typeof a._progressResets==='object'?a._progressResets:{};
  const resetB=b._progressResets&&typeof b._progressResets==='object'?b._progressResets:{};
  const mergedResets={...resetB,...resetA};
  for(const [k,v] of Object.entries(resetB)){if(Number(resetB[k]||0)>Number(resetA[k]||0))mergedResets[k]=Number(resetB[k]||0)}
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const k of keys){
    if(k==='_studyPlans'||k==='_deletedStudyPlans'||k==='_attempts'||k==='_lastActivity'||k==='_syncMeta'||k==='_progressResets')continue;
    const l=a[k],r=b[k];
    const resetAt=Math.max(progressResetAt(a,k),progressResetAt(b,k));
    if(resetAt && k!=='_resume'){
      const lt0=Number(l?.updatedAt||0),rt0=Number(r?.updatedAt||0);
      if(resetAt>=Math.max(lt0,rt0)){
        delete out[k];
        if(progressResetAt(a,k)>=progressResetAt(b,k))localWon=true;
        continue;
      }
    }
    if(k==='_resume'){
      const lr=Math.max(resetCoversResume(a,l),resetCoversResume(a,r));
      const rr=Math.max(resetCoversResume(b,l),resetCoversResume(b,r));
      const ra=Math.max(lr,rr);
      const lt=Number(l?.updatedAt||0),rt=Number(r?.updatedAt||0);
      if(ra>=Math.max(lt,rt)){delete out[k];if(lr>=rr)localWon=true;continue}
    }
    if(l===undefined)continue;
    if(r===undefined){out[k]=l;localWon=true;continue}
    /* A section snapshot can carry an older batch timestamp than the global
       activity event that produced it. When the local activity is newer, do
       not let an older cloud snapshot resurrect stale progress after refresh. */
    const localIsCurrentActivity=localActivityAt>remoteActivityAt &&
      k===stateKey(String(a._lastActivity?.code||''),String(a._lastActivity?.type||''),Number(a._lastActivity?.sectionIndex||0));
    const remoteIsCurrentActivity=remoteActivityAt>localActivityAt &&
      k===stateKey(String(b._lastActivity?.code||''),String(b._lastActivity?.type||''),Number(b._lastActivity?.sectionIndex||0));
    if(localIsCurrentActivity){out[k]=l;localWon=true;continue}
    if(remoteIsCurrentActivity){out[k]=r;continue}
    const lt=Number(l?.updatedAt||0),rt=Number(r?.updatedAt||0);
    /* Progress snapshots are section-level containers, while individual
       answers are the real units of progress. Merge the answer maps instead
       of replacing an older remote section with a newer local snapshot. This
       preserves existing cloud answers and adds newer local answers. */
    if(k.includes('|') && l && r && typeof l==='object' && typeof r==='object' &&
       (l.answers||r.answers||l.checked||r.checked||l.answerEvents||r.answerEvents)){
      const mergedSection={...r,...l};
      const answers={...(r.answers||{}),...(l.answers||{})};
      const checked={...(r.checked||{}),...(l.checked||{})};
      const answerEvents={...(r.answerEvents||{}),...(l.answerEvents||{})};
      mergedSection.answers=answers;
      mergedSection.checked=checked;
      mergedSection.answerEvents=answerEvents;
      mergedSection.updatedAt=Math.max(lt,rt);
      out[k]=mergedSection;
      if(lt>rt)localWon=true;
      continue;
    }
    if(lt>=rt){out[k]=l;if(lt>rt)localWon=true}else out[k]=r;
  }
  const plans=mergePlanArrays(a._studyPlans,b._studyPlans,a._deletedStudyPlans,b._deletedStudyPlans); out._studyPlans=plans.out; out._deletedStudyPlans=plans.deleted; localWon ||= plans.localWon;
  /* Keep tombstones in both stores so stale cloud snapshots cannot restore deleted plans. */
  if(Object.keys(out._deletedStudyPlans).length===0)delete out._deletedStudyPlans;
  const attempts=new Map();
  [...(Array.isArray(b._attempts)?b._attempts:[]),...(Array.isArray(a._attempts)?a._attempts:[])].forEach(x=>{
    if(!x?.id)return;
    const id=String(x.id),prev=attempts.get(id);
    if(!prev||Number(x.updatedAt||x.timestamp||0)>=Number(prev.updatedAt||prev.timestamp||0))attempts.set(id,x);
  });
  out._attempts=[...attempts.values()].sort((x,y)=>Number(x.timestamp||0)-Number(y.timestamp||0)).slice(-5000);
  const la=a._lastActivity,ra=b._lastActivity;
  if(la||ra){if(!ra){out._lastActivity=la;localWon=true}else if(!la)out._lastActivity=ra;else out._lastActivity=Number(la.updatedAt||0)>=Number(ra.updatedAt||0)?la:ra}
  /* Keep reset tombstones in sync, but drop a tombstone once a newer answer snapshot exists. */
  for(const k of Object.keys(mergedResets)){
    const t=Number(mergedResets[k]||0);
    if(!t)delete mergedResets[k];
    else if(k.startsWith('package:')||k.startsWith('section:')){
      const scope=k.startsWith('package:')?k.slice(8):k.slice(8);
      const prefix=scope.endsWith('|')?scope:scope+'|';
      const newer=Object.keys(out).some(key=>key.startsWith(prefix)&&Number(out[key]?.updatedAt||0)>t);
      if(newer)delete mergedResets[k];
    }
  }
  if(Object.keys(mergedResets).length)out._progressResets=mergedResets;else delete out._progressResets;
  /* Keep sync metadata stable when the actual learner data did not change.
     Adding Date.now() here made every merge look different and triggered a full-row PATCH. */
  const syncUpdatedAt=Math.max(Number(a._syncMeta?.updatedAt||0),Number(b._syncMeta?.updatedAt||0));
  if(syncUpdatedAt)out._syncMeta={version:1,updatedAt:syncUpdatedAt};else delete out._syncMeta;
  return {store:out,localWon};
}

function createQuestionActivity(questionId){
  const st=readStore();
  const now=Math.max(Date.now(),Number(st._lastActivity?.updatedAt||0)+1);
  const code=String(route.packageCode||''),type=String(route.type||''),sectionIndex=Number(route.sectionIndex||0),qid=String(questionId);
  const id=(currentUsername||'guest')+'_'+now+'_'+Math.random().toString(36).slice(2,10);
  const attempts=Array.isArray(st._attempts)?st._attempts.filter(x=>x&&x.id):[];
  const event={id,timestamp:now,updatedAt:now,answeredAt:now,checkedAt:null,username:currentUsername||'',code,type,sectionIndex,questionId:qid,status:'answered',correct:null,schemaVersion:3};
  attempts.push(event); st._attempts=attempts.slice(-5000);
  st._lastActivity={code,type,sectionIndex,questionId:qid,updatedAt:now,schemaVersion:3};
  writeStore(st); scheduleCloudSync();
  try{window.dispatchEvent(new CustomEvent('hsk:progress-updated',{detail:{code,type,sectionIndex,questionId:qid,status:'answered',timestamp:now}}))}catch(e){}
  return id;
}
function updateQuestionActivity(eventId,correct){
  if(!eventId)return createQuestionActivity(arguments[2]);
  const st=readStore(); const attempts=Array.isArray(st._attempts)?st._attempts.filter(x=>x&&x.id):[];
  const i=attempts.findIndex(x=>String(x.id)===String(eventId));
  if(i<0)return null;
  const now=Math.max(Date.now(),Number(attempts[i].updatedAt||0)+1,Number(st._lastActivity?.updatedAt||0)+1);
  attempts[i]={...attempts[i],checkedAt:now,updatedAt:now,status:'checked',correct:!!correct};
  st._attempts=attempts.slice(-5000);
  st._lastActivity={code:attempts[i].code,type:attempts[i].type,sectionIndex:attempts[i].sectionIndex,questionId:attempts[i].questionId,updatedAt:now,schemaVersion:3};
  writeStore(st); scheduleCloudSync();
  try{window.dispatchEvent(new CustomEvent('hsk:progress-updated',{detail:{...attempts[i],timestamp:now}}))}catch(e){}
  return attempts[i].id;
}
function ensureQuestionActivity(questionId){
  const qid=String(questionId); if(answerEvents[qid])return answerEvents[qid];
  const id=createQuestionActivity(qid); answerEvents[qid]=id;
  saveSectionState(route.packageCode,route.type,route.sectionIndex,answers,checked,answerEvents);
  return id;
}
function recordQuestionAttempt(questionId,correct){
  const qid=String(questionId); const eventId=answerEvents[qid]||ensureQuestionActivity(qid);
  return updateQuestionActivity(eventId,correct);
}
