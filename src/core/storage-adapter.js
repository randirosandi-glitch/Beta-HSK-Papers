/* Source module: local progress storage adapter.
 * Compatibility contract: preserve the existing key and JSON shape.
 * This is classic-script code; functions intentionally remain global for legacy callers.
 */
const STORAGE_PREFIX='hsk4-kelas-e-progress-v4:';
function storageKey(){return STORAGE_PREFIX+(currentUsername||'guest')}
function readStore(){try{return JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch(e){return {}}}
function writeStore(s){try{localStorage.setItem(storageKey(),JSON.stringify(s))}catch(e){}}
