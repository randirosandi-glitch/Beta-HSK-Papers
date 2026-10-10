/* Source module: persisted route adapter.
 * Keep the existing key and serialized route fields for backward compatibility.
 * This classic-script fragment intentionally exposes the same window functions.
 */
const LAST_ROUTE_KEY='hsk4-kelas-e-last-route-v1';
window.__hskPersistRoute=function(){try{if(!currentUsername)return;const r=route||{};localStorage.setItem(LAST_ROUTE_KEY+':'+currentUsername,JSON.stringify({screen:r.screen||'home',packageCode:r.packageCode??null,type:r.type??null,sectionIndex:r.sectionIndex??null,studyPlanId:r.studyPlanId??null,materialKey:r.materialKey??null,updatedAt:Date.now()}));}catch(e){console.warn('HSK route persist:',e)}};
window.__hskReadPersistedRoute=function(){try{if(!currentUsername)return null;const raw=localStorage.getItem(LAST_ROUTE_KEY+':'+currentUsername);if(!raw)return null;const r=JSON.parse(raw);if(!r||typeof r!=='object')return null;return {screen:String(r.screen||'home'),packageCode:r.packageCode??null,type:r.type??null,sectionIndex:r.sectionIndex??null,studyPlanId:r.studyPlanId??null,materialKey:r.materialKey??null};}catch(e){return null}};
window.__hskClearPersistedRoute=function(){try{if(currentUsername)localStorage.removeItem(LAST_ROUTE_KEY+':'+currentUsername)}catch(e){}};
