/* Source module: username/auth UI flow.
 * Preserve existing username validation, identity key usage, and cloud initialization order.
 * Runtime globals and DOM handlers intentionally remain classic-script compatible.
 */
function saveUsername(){const v=normalizeUsername($('usernameInput')?.value);const hint=$('usernameHint');if(!validUsername(v)){if(hint)hint.textContent='Username harus 3–24 karakter dan hanya boleh memakai huruf kecil, angka, titik, garis bawah, atau tanda hubung.';return}currentUsername=v;setUsernameLocal(v);hideUsernameModal();renderUserPill();renderContext();renderHome();renderScores();renderPackagesScreen();pullCloudState(true)}
function changeUsername(){if($('usernameInput'))$('usernameInput').value=currentUsername;showUsernameModal()}
function renderUserPill(){
  let old=$('usernamePill');if(old)old.remove();
  const top=$('.toprow');if(!top)return;
  let oldLogout=$('topLogout');if(oldLogout)oldLogout.remove();
  if(!currentUsername)return;
  const b=document.createElement('button');b.id='usernamePill';b.className='usernamePill';b.type='button';b.title='Ganti username';b.innerHTML='<span>@</span><b>'+esc(currentUsername)+'</b>';b.onclick=changeUsername;top.appendChild(b);
  const l=document.createElement('button');l.id='topLogout';l.className='backTextOnly logoutTop';l.type='button';l.textContent='Keluar';l.onclick=logout;top.appendChild(l);
}
async function initUsernameAndCloud(){currentUsername=getUsername();renderUserPill();if(!currentUsername){showUsernameModal();return false}await pullCloudState();return true}
