/* Source module: local-first cloud synchronization.
 * Progress stays in local storage immediately and is batch-synced after it has
 * remained pending for 12 hours. Pulls are also limited to one per 12 hours.
 */
async function pullCloudStateInternal(force=false){
  if(!currentUsername||!cloudEnabled())return false;
  try{
    /* Read after the network lookup: the learner may answer while cloudFindUser
       is in flight. Merging a pre-request snapshot can roll back newer progress. */
    const row=await cloudFindUser(currentUsername);
    const local=readStore();
    if(!row){
      /* Do not create an empty cloud row, but keep pre-existing local progress queued. */
      cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=null;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
      if(hasSyncableProgress(local))markCloudPending();
      renderHome();renderScores();renderPackagesScreen();refreshCurrentProgress();
      return true;
    }
    const remote=row.data||{};
    cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=remote;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    const merged=mergeStoresLatest(local,remote).store;
    writeStore(merged);
    if(JSON.stringify(merged)!==JSON.stringify(remote))markCloudPending();
    markCloudSnapshotSynced(remote);
    renderHome();renderScores();renderPackagesScreen();refreshCurrentProgress();
    return true;
  }catch(e){console.warn('Cloud sync pull failed',e);return false}
}
let cloudPullInFlight=null,cloudLastPullAt=0,cloudLastPullUsername='';
let cloudLastSyncedSnapshot='';
let cloudKnownRemoteUsername='',cloudKnownRemoteStore=null,cloudKnownRemoteLoaded=false,cloudKnownRemoteAt=0;
const CLOUD_SYNC_INTERVAL=12*60*60*1000;
const CLOUD_PULL_COOLDOWN=CLOUD_SYNC_INTERVAL;
const CLOUD_SNAPSHOT_MAX_AGE=15*60*1000;
const CLOUD_SYNC_META_PREFIX='hsk4-kelas-e-cloud-sync-v1:';
function cloudSyncStorageKey(kind,username=currentUsername){return CLOUD_SYNC_META_PREFIX+kind+':'+String(username||'')}
function readCloudTimestamp(kind,username=currentUsername){
  try{const value=Number(localStorage.getItem(cloudSyncStorageKey(kind,username)));return Number.isFinite(value)&&value>0?value:0}catch(e){return 0}
}
function writeCloudTimestamp(kind,value,username=currentUsername){
  try{localStorage.setItem(cloudSyncStorageKey(kind,username),String(value));return true}catch(e){return false}
}
function cloudPendingSince(){return readCloudTimestamp('pending')}
function markCloudPending(){
  if(!currentUsername||!cloudEnabled())return 0;
  const existing=cloudPendingSince();
  if(existing)return existing;
  const now=Date.now();
  return writeCloudTimestamp('pending',now)?now:0;
}
function clearCloudPending(){
  try{localStorage.removeItem(cloudSyncStorageKey('pending'))}catch(e){}
}
function hasSyncableProgress(store){
  return !!store&&Object.keys(store).some(key=>key!=='_syncMeta');
}
function markCloudSnapshotSynced(store){
  try{cloudLastSyncedSnapshot=JSON.stringify(store??readStore())}catch(e){cloudLastSyncedSnapshot=''}
}
function flushPendingCloudSync(){
  if(!currentUsername||!cloudEnabled()||typeof navigator!=='undefined'&&navigator.onLine===false)return false;
  const since=cloudPendingSince();
  if(!since||Date.now()-since<CLOUD_SYNC_INTERVAL)return false;
  clearTimeout(cloudSyncTimer);cloudSyncTimer=null;
  return pushCloudState(readStore());
}
function pullCloudState(force=false){
  if(cloudPullInFlight)return cloudPullInFlight;
  const now=Date.now(),username=currentUsername;
  const persistedAt=readCloudTimestamp('pull',username);
  const lastAt=cloudLastPullUsername===username?Math.max(cloudLastPullAt,persistedAt):persistedAt;
  if(lastAt&&now-lastAt<CLOUD_PULL_COOLDOWN){
    flushPendingCloudSync();
    return Promise.resolve(false);
  }
  cloudLastPullUsername=username;cloudLastPullAt=now;
  cloudPullInFlight=pullCloudStateInternal(force).then(result=>{
    if(result&&currentUsername===username)writeCloudTimestamp('pull',Date.now(),username);
    return result;
  }).finally(()=>{
    cloudPullInFlight=null;
    flushPendingCloudSync();
  });
  return cloudPullInFlight;
}
async function pushCloudState(store){
  if(!currentUsername||!cloudEnabled())return false;
  if(cloudSyncBusy){cloudSyncPending=true;return false}
  const snapshotBeforeRequest=readStore();
  let localSnapshot='';
  try{localSnapshot=JSON.stringify(snapshotBeforeRequest)}catch(e){}
  if(localSnapshot&&localSnapshot===cloudLastSyncedSnapshot){
    clearCloudPending();
    return true;
  }
  let pendingSince=cloudPendingSince();
  if(!pendingSince)pendingSince=markCloudPending();
  if(!pendingSince||Date.now()-pendingSince<CLOUD_SYNC_INTERVAL)return false;
  cloudSyncBusy=true;
  let syncPayload=null;
  try{
    /* Only fetch when no fresh current-user snapshot is known. */
    const remoteKnown=cloudKnownRemoteLoaded&&cloudKnownRemoteUsername===currentUsername&&Date.now()-cloudKnownRemoteAt<CLOUD_SNAPSHOT_MAX_AGE;
    let remoteStore=remoteKnown?cloudKnownRemoteStore:null;
    if(!remoteKnown){
      const row=await cloudFindUser(currentUsername);
      remoteStore=row?(row.data||{}):null;
      cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=remoteStore;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    }
    const latest=readStore();
    if(remoteStore===null){
      await cloudCreateUser(currentUsername,latest);
      syncPayload=latest;
      const afterCreate=readStore();
      if(JSON.stringify(afterCreate)!==JSON.stringify(latest)){
        await cloudUpdateUser(currentUsername,afterCreate);
        syncPayload=afterCreate;
      }
    }else{
      const merged=mergeStoresLatest(latest,remoteStore).store;
      writeStore(merged);
      syncPayload=merged;
      if(JSON.stringify(merged)!==JSON.stringify(remoteStore))await cloudUpdateUser(currentUsername,merged);
    }
    cloudKnownRemoteStore=syncPayload;cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    markCloudSnapshotSynced(syncPayload);
    if(JSON.stringify(readStore())===JSON.stringify(syncPayload))clearCloudPending();
    else cloudSyncPending=true;
    cloudSyncRetryCount=0;
    return true;
  }catch(e){console.warn('Cloud sync push failed',e);cloudSyncPending=true;return false}
  finally{
    cloudSyncBusy=false;
    if(cloudSyncPending){
      cloudSyncPending=false;clearTimeout(cloudSyncTimer);
      if(cloudSyncRetryCount<CLOUD_SYNC_MAX_RETRIES){
        const delay=Math.min(60000,5000*Math.pow(2,cloudSyncRetryCount));
        cloudSyncRetryCount++;
        cloudSyncTimer=setTimeout(()=>pushCloudState(readStore()),delay);
      }
    }
  }
}
function scheduleCloudSync(){
  if(!currentUsername||!cloudEnabled())return;
  markCloudPending();
  flushPendingCloudSync();
}
function flushCloudSync(){return flushPendingCloudSync()}
function syncAfterSectionCheck(){scheduleCloudSync()}
