/* Source module: reading passage loader.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';

  /*
   * Reading Passage Integrity Layer
   * --------------------------------
   * Keeps the existing READING_PASSAGES renderer/UI untouched.
   * The central data file is the source for all package passages, so newly
   * added packages do not require another hard-coded entry in index.html.
   *
   * Supported source shapes:
   *   1) { "H41001": { ... } }
   *   2) { "content": "{\"H41001\":{...}}" }
   *   3) { "content": { "H41001": { ... } } }
   *   4) { "reading_passages": { ... } } / { "passages": { ... } }
   */
  var passageLoadPromise=null;

  function parsePassagePayload(payload){
    var value=payload;
    for(var i=0;i<3;i++){
      if(typeof value==='string'){
        try{value=JSON.parse(value)}catch(e){return null}
        continue;
      }
      if(value && typeof value==='object'){
        if(value.reading_passages && typeof value.reading_passages==='object'){
          value=value.reading_passages; continue;
        }
        if(value.passages && typeof value.passages==='object'){
          value=value.passages; continue;
        }
        if(typeof value.content==='string'){
          try{value=JSON.parse(value.content);continue}catch(e){}
        }
        if(value.content && typeof value.content==='object'){
          value=value.content; continue;
        }
      }
      break;
    }
    return value && typeof value==='object' && !Array.isArray(value) ? value : null;
  }

  function normalizePassageMap(payload){
    var source=parsePassagePayload(payload);
    if(!source)return null;
    var map={};

    Object.keys(source).forEach(function(code){
      var entry=source[code];
      entry=parsePassagePayload(entry)||entry;
      if(!entry || typeof entry!=='object' || Array.isArray(entry))return;

      var clean={};
      Object.keys(entry).forEach(function(key){
        var text=entry[key];
        if(typeof text==='string' && text.trim())clean[String(key)]=text;
      });
      if(Object.keys(clean).length)map[String(code)]=clean;
    });

    return map;
  }

  function mergePassages(map){
    if(!map || typeof READING_PASSAGES!=='object')return 0;
    var count=0;
    Object.keys(map).forEach(function(code){
      var incoming=map[code];
      if(!incoming || typeof incoming!=='object')return;
      if(!READING_PASSAGES[code] || typeof READING_PASSAGES[code]!=='object'){
        READING_PASSAGES[code]={};
      }
      Object.keys(incoming).forEach(function(key){
        READING_PASSAGES[code][key]=incoming[key];
        count++;
      });
    });
    return count;
  }

  function ensureReadingPassages(){
    if(passageLoadPromise)return passageLoadPromise;

    var passageController=new AbortController();
    var passageTimeout=setTimeout(function(){passageController.abort()},8000);
    passageLoadPromise=fetch('./data/reading-passages.json',{
      cache:'no-store',
      signal:passageController.signal,
      headers:{Accept:'application/json'}
    }).then(function(r){
      if(!r.ok)throw new Error('Reading passages HTTP '+r.status);
      return r.json();
    }).then(function(payload){
      var map=normalizePassageMap(payload);
      if(!map)throw new Error('Format reading-passages.json tidak valid');
      var merged=mergePassages(map);
      window.__hskReadingPassagesReady=true;
      window.__hskReadingPassageCount=Object.keys(map).length;
      console.info('HSK reading passages ready:',Object.keys(map).length,'packages /',merged,'passages');
      return true;
    }).catch(function(err){
      /*
       * Never break the app when the optional passage source is unavailable.
       * Existing embedded passages remain usable as fallback.
       */
      window.__hskReadingPassagesReady=false;
      console.warn('HSK reading passages unavailable; embedded fallback retained.',err);
      return false;
    }).finally(function(){clearTimeout(passageTimeout)});

    return passageLoadPromise;
  }

  window.__hskEnsureReadingPassages=ensureReadingPassages;

  /* Warm the cache in the background; failure is non-blocking. */
  ensureReadingPassages();
})();
