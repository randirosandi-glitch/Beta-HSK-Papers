/* Source module: cloud pull/push orchestration and sync queue.
 * Preserve current pull cooldown, snapshot freshness, merge ordering, retry limits,
 * and explicit section-check commit behavior.
 */
async function pullCloudStateInternal(force=false){
  if(!currentUsername||!cloudEnabled())return false;
  try{
    /* Read after the network lookup, not before it: the learner may answer while
       cloudFindUser is in flight. Merging a pre-request snapshot can roll back
       that newer local answer when the response arrives. */
    const row=await cloudFindUser(currentUsername);
    const local=readStore();
    if(!row){
      /* Remember that this username has no cloud row yet. Do not create it until
         the learner explicitly checks a section. */
      cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=null;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
      renderHome();renderScores();renderPackagesScreen();refreshCurrentProgress();
      return true;
    }
    const remote=row.data||{};
    cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=remote;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    const merged=mergeStoresLatest(local,remote).store;
    writeStore(merged);
    /* Pulls may merge cloud data into local storage, but never write back to cloud.
       Cloud progress is committed only by syncAfterSectionCheck(). */
    markCloudSnapshotSynced(remote);
    renderHome();renderScores();renderPackagesScreen();refreshCurrentProgress();
    return true;
  }catch(e){console.warn('Cloud sync pull failed',e);return false}
}
let cloudPullInFlight=null,cloudLastPullAt=0;
let cloudLastSyncedSnapshot='';
/* Reuse the latest fetched cloud snapshot for explicit section commits, avoiding
   a full GET before every PATCH. Refresh this snapshot on login/focus pulls. */
let cloudKnownRemoteUsername='',cloudKnownRemoteStore=null,cloudKnownRemoteLoaded=false,cloudKnownRemoteAt=0;
const CLOUD_PULL_COOLDOWN=15*60*1000;
const CLOUD_SNAPSHOT_MAX_AGE=15*60*1000;
function markCloudSnapshotSynced(store){try{cloudLastSyncedSnapshot=JSON.stringify(store??readStore())}catch(e){cloudLastSyncedSnapshot=''}}
function pullCloudState(force=false){
  if(cloudPullInFlight)return cloudPullInFlight;
  const now=Date.now();
  if(!force&&now-cloudLastPullAt<CLOUD_PULL_COOLDOWN)return Promise.resolve(false);
  cloudLastPullAt=now;
  cloudPullInFlight=pullCloudStateInternal(force).finally(()=>{cloudPullInFlight=null});
  return cloudPullInFlight;
}
async function pushCloudState(store){
  if(!currentUsername||!cloudEnabled())return false;
  if(cloudSyncBusy){cloudSyncPending=true;return false}
  const snapshotBeforeRequest=readStore();
  let localSnapshot='';
  try{localSnapshot=JSON.stringify(snapshotBeforeRequest)}catch(e){}
  /* If this exact local snapshot was already synced, avoid another GET entirely.
     Cross-device updates are still checked by the throttled pull on focus/visibility. */
  if(localSnapshot&&localSnapshot===cloudLastSyncedSnapshot)return true;
  cloudSyncBusy=true;
  try{
    /* Only fetch when no current-user snapshot is known. Section checks reuse
       the latest snapshot fetched at login/focus, reducing repeated full-row GETs. */
    let remoteKnown=cloudKnownRemoteLoaded&&cloudKnownRemoteUsername===currentUsername&&Date.now()-cloudKnownRemoteAt<CLOUD_SNAPSHOT_MAX_AGE;
    let remoteStore=remoteKnown?cloudKnownRemoteStore:null;
    if(!remoteKnown){
      const row=await cloudFindUser(currentUsername);
      remoteKnown=true;remoteStore=row?(row.data||{}):null;
      cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteStore=remoteStore;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    }
    /* Use the newest local snapshot after any network lookup. */
    const latest=readStore();
    if(remoteStore===null){
      await cloudCreateUser(currentUsername,latest);
      const afterCreate=readStore();
      if(JSON.stringify(afterCreate)!==JSON.stringify(latest)) await cloudUpdateUser(currentUsername,afterCreate);
      cloudKnownRemoteStore=readStore();cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
      markCloudSnapshotSynced(readStore());
      cloudSyncRetryCount=0;
      return true;
    }
    const remote=remoteStore;
    const merged=mergeStoresLatest(latest,remote).store;
    writeStore(merged);
    /* Skip a full-row PATCH when the merged cloud snapshot is already identical. */
    if(JSON.stringify(merged)!==JSON.stringify(remote)) await cloudUpdateUser(currentUsername,merged);
    cloudKnownRemoteStore=readStore();cloudKnownRemoteUsername=currentUsername;cloudKnownRemoteLoaded=true;cloudKnownRemoteAt=Date.now();
    markCloudSnapshotSynced(readStore());
    cloudSyncRetryCount=0;
    return true;
  }catch(e){console.warn('Cloud sync push failed',e);cloudSyncPending=true;return false}
  finally{cloudSyncBusy=false;if(cloudSyncPending){cloudSyncPending=false;clearTimeout(cloudSyncTimer);if(cloudSyncRetryCount<CLOUD_SYNC_MAX_RETRIES){const delay=Math.min(60000,5000*Math.pow(2,cloudSyncRetryCount));cloudSyncRetryCount++;cloudSyncTimer=setTimeout(()=>pushCloudState(readStore()),delay)}}}
}
/* Local answers/progress are saved immediately, but cloud writes are committed only
   when the learner presses the section-check button (grade()). */
function scheduleCloudSync(){clearTimeout(cloudSyncTimer)}
function flushCloudSync(){clearTimeout(cloudSyncTimer)}
function syncAfterSectionCheck(){if(!currentUsername||!cloudEnabled())return;clearTimeout(cloudSyncTimer);pushCloudState(readStore())}
