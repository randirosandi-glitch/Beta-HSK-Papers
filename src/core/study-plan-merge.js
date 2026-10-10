/* Source module: local/cloud study-plan merge.
 * Keep deletion tombstones authoritative and resolve conflicting plan versions by updatedAt.
 * Classic-script global function retained for the progress-store merge caller.
 */
function mergePlanArrays(localPlans,remotePlans,localDeleted,remoteDeleted){
  const deleted={};
  for(const [id,stamp] of Object.entries(remoteDeleted&&typeof remoteDeleted==='object'?remoteDeleted:{}))deleted[String(id)]=Number(stamp)||Date.now();
  for(const [id,stamp] of Object.entries(localDeleted&&typeof localDeleted==='object'?localDeleted:{}))deleted[String(id)]=Math.max(Number(deleted[String(id)]||0),Number(stamp)||Date.now());
  const lm=new Map((Array.isArray(localPlans)?localPlans:[]).filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
  const rm=new Map((Array.isArray(remotePlans)?remotePlans:[]).filter(x=>x&&x.id!=null).map(x=>[String(x.id),x]));
  const ids=new Set([...lm.keys(),...rm.keys()]); const out=[]; let localWon=false;
  ids.forEach(id=>{
    /* A deletion tombstone wins over stale local or cloud copies. Plan IDs are unique and never reused. */
    if(Object.prototype.hasOwnProperty.call(deleted,id))return;
    const l=lm.get(id),r=rm.get(id);
    if(!r){out.push(l);localWon=true;return}
    if(!l){out.push(r);return}
    const lt=Number(l.updatedAt||0),rt=Number(r.updatedAt||0);
    if(lt>=rt){out.push(l);if(lt>rt)localWon=true}else out.push(r);
  });
  return {out,localWon,deleted};
}
