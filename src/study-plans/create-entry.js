(function(){
  /* Final repair: always provide a visible entry point to create a new playlist. */
  const previousRenderStudyPlans = window.renderStudyPlans;
  window.renderStudyPlans = function(){
    if(typeof previousRenderStudyPlans === 'function'){
      previousRenderStudyPlans.apply(this, arguments);
    }
    const grid = document.getElementById('studyPlansGrid');
    if(!grid) return;

    /* Avoid duplicates if the renderer is called repeatedly. */
    grid.querySelectorAll('.studyPlanCreateCard').forEach(el=>el.remove());
    /* The empty state already contains its own create action; avoid showing a duplicate card. */
    if(grid.querySelector('.studyPlanEmpty')) return;

    const createCard = document.createElement('button');
    createCard.type = 'button';
    createCard.className = 'studyPlanCard studyPlanCreateCard';
    createCard.setAttribute('aria-label','Buat Rencana Belajar Baru');
    createCard.innerHTML = `
      <div class="studyPlanIcon">＋</div>
      <h3>Buat Rencana Baru</h3>
      <div class="studyPlanDesc">Buat playlist untuk tujuan belajar yang berbeda.</div>
    `;
    createCard.addEventListener('click', function(){
      if(typeof window.openStudyPlanCreator === 'function'){
        window.openStudyPlanCreator();
      }
    });
    grid.appendChild(createCard);
  };

  const style = document.createElement('style');
  style.id = 'study-plan-create-card-final-style';
  style.textContent = `
    .studyPlanCreateCard{
      cursor:pointer;
      text-align:left;
      width:100%;
      font:inherit;
      color:inherit;
      appearance:none;
      -webkit-appearance:none;
    }
    .studyPlanCreateCard:focus-visible{
      outline:2px solid var(--accent,#78a7ff);
      outline-offset:3px;
    }
    .studyPlanCreateCard .studyPlanIcon{
      display:flex;
      align-items:center;
      justify-content:center;
    }
  `;
  document.head.appendChild(style);

  /* If the app is already on Rencana when this patch executes, render immediately. */
  if(document.readyState !== 'loading'){
    setTimeout(function(){
      if(document.getElementById('studyPlansGrid') && 
         (typeof window.openStudyPlans === 'function' || document.getElementById('studyPlans')?.classList.contains('active'))){
        window.renderStudyPlans();
      }
    },0);
  }
})();
