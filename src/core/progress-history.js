/* Source module: recent package progress-history selection.
 * Read-only model helpers; preserve existing store schema and UI-facing return shape.
 */
function getProgressHistory(limit=3){
  const items=[],store=readStore();
  const attempts=Array.isArray(store._attempts)?store._attempts:[];
  const latestByCode=new Map();let latestAttempt=null;
  for(const attempt of attempts){if(!attempt||!attempt.code)continue;const ts=Number(attempt.updatedAt||attempt.timestamp||0);const code=String(attempt.code);if(ts>Number(latestByCode.get(code)||0))latestByCode.set(code,ts);if(!latestAttempt||ts>Number(latestAttempt.updatedAt||latestAttempt.timestamp||0))latestAttempt=attempt;}
  const last=store._lastActivity&&store._lastActivity.code?store._lastActivity:latestAttempt;
  /* Activity metadata is authoritative for identifying the latest package.
     This also works when the package catalog is still lazy-loading. */
  if(last?.code&&DB[last.code]){
    const st=packageStats(last.code,store);
    if(st.answered>0 || attempts.some(x=>String(x.code)===String(last.code))){
      items.push({code:last.code,st,latest:Number(last.updatedAt||last.timestamp||0),type:last.type,sectionIndex:Number(last.sectionIndex),resume:store._resume?.code===last.code?store._resume:null});
    }
  }
  Object.keys(DB).forEach(code=>{
    if(items.some(x=>x.code===code))return;
    const st=packageStats(code,store); let latest=0,latestType=null,latestSection=null;
    Object.entries(META).forEach(([type])=>(DB[code]?.[type]||[]).forEach((_,i)=>{
      const raw=store[stateKey(code,type,i)];
      if(raw?.updatedAt&&Number(raw.updatedAt)>latest){latest=Number(raw.updatedAt);latestType=type;latestSection=i}
    }));
    const attemptLatest=Number(latestByCode.get(String(code))||0);
    latest=Math.max(latest,attemptLatest);
    if(st.answered>0 || attemptLatest>0)items.push({code,st,latest,type:latestType,sectionIndex:latestSection,resume:store._resume?.code===code?store._resume:null});
  });
  items.sort((a,b)=>b.latest-a.latest);return items.slice(0,Math.max(1,Number(limit)||3));
}
function getLastProgress(){return getProgressHistory(1)[0]||null;}
function formatHistoryDate(ts){
  if(!ts)return '';
  try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(Number(ts)));}
  catch(e){return '';}
}
