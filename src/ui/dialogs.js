/* Source module: app dialog helpers.
 * Exact extraction from the existing inline script; preserve execution order and globals.
 */

(function(){
  'use strict';
  let dialogEl=null, dialogResolve=null, dialogDefault='confirm';
  function ensureDialog(){
    if(dialogEl)return dialogEl;
    dialogEl=document.createElement('div');
    dialogEl.className='modal';
    dialogEl.id='appDialog';
    dialogEl.innerHTML='<div class="appDialogBox"><div class="appDialogIcon" id="appDialogIcon" aria-hidden="true">?</div><h3 id="appDialogTitle">Konfirmasi</h3><p id="appDialogMessage"></p><div class="appDialogBtns"><button class="btn" id="appDialogCancel" type="button">Batal</button><button class="btn primary" id="appDialogOk" type="button">Oke</button></div></div>';
    document.body.appendChild(dialogEl);
    const finish=(value)=>{if(!dialogEl)return;dialogEl.classList.remove('show');dialogEl.setAttribute('aria-hidden','true');const r=dialogResolve;dialogResolve=null;if(r)r(value);};
    dialogEl.querySelector('#appDialogCancel').addEventListener('click',()=>finish(false));
    dialogEl.querySelector('#appDialogOk').addEventListener('click',()=>finish(true));
    dialogEl.addEventListener('click',e=>{if(e.target===dialogEl&&dialogDefault==='confirm')finish(false)});
    return dialogEl;
  }
  window.appConfirm=function(title,message,onConfirm,opts={}){
    const el=ensureDialog(), box=el.querySelector('.appDialogBox'), icon=el.querySelector('#appDialogIcon'), cancel=el.querySelector('#appDialogCancel'), ok=el.querySelector('#appDialogOk');
    dialogDefault='confirm';
    el.querySelector('#appDialogTitle').textContent=String(title||'Konfirmasi');
    el.querySelector('#appDialogMessage').textContent=String(message||'');
    icon.textContent=opts.icon||'?';
    cancel.textContent=opts.cancelText||'Batal';
    ok.textContent=opts.okText||'Oke';
    ok.className='btn '+(opts.danger?'appDialogDanger':'primary');
    box.dataset.dialogKind=opts.danger?'danger':'confirm';
    el.classList.add('show');el.setAttribute('aria-hidden','false');
    dialogResolve=value=>{if(value&&typeof onConfirm==='function')onConfirm();};
  };
  window.appNotice=function(title,message,opts={}){
    const el=ensureDialog(), icon=el.querySelector('#appDialogIcon'), cancel=el.querySelector('#appDialogCancel'), ok=el.querySelector('#appDialogOk');
    dialogDefault='notice';
    el.querySelector('#appDialogTitle').textContent=String(title||'Informasi');
    el.querySelector('#appDialogMessage').textContent=String(message||'');
    icon.textContent=opts.icon||'i';
    cancel.style.display='none';
    ok.textContent=opts.okText||'Mengerti';
    ok.className='btn primary';
    el.classList.add('show');el.setAttribute('aria-hidden','false');
    dialogResolve=()=>{cancel.style.display='';};
  };
})();
