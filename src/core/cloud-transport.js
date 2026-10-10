/* Source module: Supabase REST transport.
 * Preserve current request payloads, selected fields, headers, and error messages.
 * This module does not change sync cadence, retries, or stored cloud schema.
 */
function cloudUrl(path=''){return CLOUD_CONFIG.url.replace(/\/$/,'')+'/rest/v1/'+CLOUD_TABLE+path}
function cloudErrorMessage(status){if(status===401||status===403)return 'Supabase menolak akses. Periksa RLS policy untuk anon (SELECT, INSERT, UPDATE).';if(status===409)return 'Username sudah terdaftar.';return 'Gagal terhubung ke Supabase (HTTP '+status+').'}
function cloudHeaders(extra={}){return {'apikey':CLOUD_CONFIG.anonKey,'Authorization':'Bearer '+CLOUD_CONFIG.anonKey,'Content-Type':'application/json',...extra}}
async function cloudFindUser(username){
  if(!cloudEnabled())return null;
  /* Only request the JSON payload needed by sync; omit unused row metadata. */
  const url=cloudUrl('?username=eq.'+encodeURIComponent(username)+'&select=data&limit=1');
  const r=await fetch(url,{headers:cloudHeaders(),cache:'no-store'});
  if(!r.ok)throw new Error(cloudErrorMessage(r.status));
  const rows=await r.json();
  return rows[0]||null;
}
async function cloudCreateUser(username,store={}){
  if(!cloudEnabled())return true;
  const r=await fetch(cloudUrl(),{
    method:'POST',
    headers:cloudHeaders({'Prefer':'return=minimal'}),
    body:JSON.stringify({username,data:store||{}})
  });
  if(!r.ok)throw new Error(cloudErrorMessage(r.status));
  return true;
}
async function cloudUpdateUser(username,store){
  if(!cloudEnabled())return true;
  const url=cloudUrl('?username=eq.'+encodeURIComponent(username));
  const r=await fetch(url,{
    method:'PATCH',
    headers:cloudHeaders({'Prefer':'return=minimal'}),
    body:JSON.stringify({data:store})
  });
  if(!r.ok)throw new Error(cloudErrorMessage(r.status));
  return true;
}
function syncNowStamp(){return Date.now()}
