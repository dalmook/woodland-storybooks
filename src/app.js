const $=s=>document.querySelector(s);
const dataURL=new URL('./books.json',import.meta.url);dataURL.search=new URL(import.meta.url).search;
const data=await fetch(dataURL).then(r=>{if(!r.ok)throw Error('Book data unavailable');return r.json()});
let book=data.books[0];
const voicesForBook=()=>book.voices||data.voices;
const castForBook=()=>book.cast||data.cast||{};
const audio=$('#narration');
let savedAuto=false;try{savedAuto=localStorage.getItem('woodland.autoAdvance')==='true'}catch{}
const state={lang:'ko',voice:'female',page:-1,reader:false,mobile:innerWidth<=1100,opening:false,motion:matchMedia('(prefers-reduced-motion: reduce)').matches,token:0,autoAdvance:savedAuto,chain:0};
let flip,resizeTimer,noticeTimer,autoTimer,pendingAuto,highlightFrame,currentCues=[],activeLine='',activeWord='',lastViewportWidth=innerWidth,openingEpoch=0;
const t=(ko,en)=>state.lang==='ko'?ko:en;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderShelf(){
 const front=$('.shelf-book .cover-face');front.querySelector('img').src=book.cover;front.querySelector('img').alt=`${book.title.ko} 수채화 표지`;
 front.querySelector('.cover-type').classList.toggle('bottom',book.coverLayout==='bottom');front.querySelector('strong').textContent=book.title.ko;front.querySelector('em').textContent=book.title.en;front.querySelector('.cover-type>span').textContent=book.subtitle.ko;
 $('#open-book').setAttribute('aria-label',`${book.title.ko} 책 펼치기`);$('.feature-note small').textContent=`${book.title.ko} · ${book.subtitle.ko}`;
 $('.shelf-caption>span').textContent=book.author.ko;
 $('#extra-books').hidden=data.books.length<2;$('#extra-books').style.setProperty('--volumes',data.books.length);
 $('#extra-books').replaceChildren(...data.books.map(b=>{const btn=document.createElement('button');btn.innerHTML=`<span class="mini-spine"></span><span class="mini-cover"><img src="${esc(b.cover)}" alt="" loading="lazy"><span>${esc(b.title.ko)}</span></span><span class="mini-caption">${esc(b.title.ko)}<small>${esc(b.title.en)}</small></span>`;btn.setAttribute('aria-label',`${b.title.ko} 책 펼치기`);btn.setAttribute('aria-pressed',String(b.id===book.id));btn.addEventListener('click',()=>{book=b;renderShelf();open()});return btn}));
 document.title=`숲속의 서재 — ${book.title.ko}`;$('#reader').setAttribute('aria-label',`${book.title.ko} 동화책`);$('.library-footer').lastElementChild.textContent=`한국어 & English · 해설과 인물 대사 · ${data.books.length}권의 이야기`; 
}
renderShelf();
function cover(){return `<div class="book-page page-cover" data-density="hard"><img src="${book.cover}" alt="${esc(book.title[state.lang]+' '+t('표지','cover'))}"><div class="cover-type ${book.coverLayout==='bottom'?'bottom':''}"><small>THE WOODLAND CLASSICS</small><strong>${book.title[state.lang]}</strong><em>${esc(book.title.en)}</em><span>${book.subtitle[state.lang]}</span></div><span class="cover-frame"></span></div>`}
function art(p){return `<div class="art ${p.motion}"><img class="art-base" src="${p.image}" alt="${esc(p.alt[state.lang])}" draggable="false"><span class="cloud"></span><span class="light-wash"></span><span class="leaf"></span><span class="leaf l2"></span><span class="leaf l3"></span><span class="firefly"></span><span class="firefly f2"></span><span class="art-foreground"></span><span class="illustration-credit">THE WOODLAND LIBRARY</span></div>`}
function readingText(p){
 const lines=p.lines?.[state.lang];if(!lines)return p.paragraphs[state.lang].map(s=>`<p>${esc(s)}</p>`).join('');
 return [0,1,2].map(paragraph=>`<p>${lines.filter(l=>l.paragraph===paragraph).map(l=>{let word=0;return `<span class="read-line" data-line="${l.id}" data-role="${l.role}">${l.text.split(/(\s+)/).map(s=>/^\s+$/.test(s)?s:`<span class="read-word" data-word="${word++}">${esc(s)}</span>`).join('')}</span>`}).join(' ')}</p>`).join('');
}
function text(p,i){return `<article class="text-page" lang="${state.lang}"><p class="chapter-no">${String(i+1).padStart(2,'0')}</p><span class="chapter-kicker">${esc(book.id.toUpperCase())} · ${esc(p.id.replaceAll('-',' ').toUpperCase())}</span><h2>${p.title[state.lang]}</h2><div class="story-text">${readingText(p)}</div><span class="folio">${i+1}</span></article>`}
function leafIndex(page){return page<0?0:state.mobile?page+1:page*2+1}
function narrative(index){if(index===0)return -1;return state.mobile?index-1:Math.floor((index-1)/2)}
function setupBook(target=-1){
 lastViewportWidth=innerWidth;
 if(flip){flip.destroy();const n=document.createElement('div');n.id='flipbook';$('.book-rest').replaceChildren(n)}
 const el=$('#flipbook');
 el.innerHTML=cover()+book.pages.map((p,i)=>state.mobile?`<div class="book-page"><div class="mobile-leaf">${art(p)}${text(p,i)}</div></div>`:`<div class="book-page">${art(p)}</div><div class="book-page">${text(p,i)}</div>`).join('')+`<div class="book-page" data-density="hard"><div class="end-leaf"><div><span class="chapter-kicker">THE END</span><h2>${t('그리고, 새로운 내일.','A new tomorrow.')}</h2><p>${t(esc(book.title.ko)+'의 이야기를 끝까지 읽었어요.<br>서재로 돌아가거나, 다시 펼쳐 보세요.','You have reached the end of '+esc(book.title.en)+'.<br>Return to the library, or read it again.')}</p></div></div></div>`;
 const available=document.documentElement.clientWidth;
 const w=state.mobile?Math.min(available-24,520):Math.min(535,(available-70)/2);
 const h=state.mobile?Math.max(860,w*1.95):Math.max(620,Math.round(w*1.16));
 $('.book-rest').style.width=`${state.mobile?w:w*2}px`;
 $('.book-rest').style.height=`${h}px`;
 flip=new St.PageFlip(el,{width:w,height:h,size:'fixed',showCover:true,usePortrait:true,startPage:leafIndex(target),drawShadow:true,maxShadowOpacity:.38,flippingTime:state.motion?80:950,mobileScrollSupport:true,swipeDistance:35,clickEventForward:true,useMouseEvents:!state.mobile,showPageCorners:!state.motion,disableFlipByClick:false});
 flip.on('flip',e=>{const n=narrative(e.data);if(n!==state.page){stopAudio();state.page=n;syncAudio()}updateControls();queueMicrotask(continueAuto)});
 flip.on('changeState',e=>{if(e.data==='flipping')stopAudio();if(e.data==='read')queueMicrotask(continueAuto)});
 flip.loadFromHTML(el.querySelectorAll('.book-page'));
 state.page=target;updateControls();syncAudio();
}
function cancelAuto(){clearTimeout(autoTimer);pendingAuto=null;state.chain++}
function clearHighlight(){cancelAnimationFrame(highlightFrame);document.querySelectorAll('.read-active').forEach(el=>{el.classList.remove('read-active');el.removeAttribute('aria-current');el.style.removeProperty('--read-progress')});document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));activeLine='';activeWord=''}
function updateHighlight(){
 const cue=currentCues.find(c=>audio.currentTime>=c.start&&audio.currentTime<c.end);
 const id=cue?.lineId||'';
 if(id!==activeLine){document.querySelectorAll('.read-active').forEach(el=>{el.classList.remove('read-active');el.removeAttribute('aria-current')});activeLine=id;activeWord='';document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));if(id)document.querySelectorAll(`[data-line="${id}"]`).forEach(el=>{el.classList.add('read-active');el.setAttribute('aria-current','true');if(state.mobile&&!audio.paused){const r=el.getBoundingClientRect();if(r.top<85||r.bottom>innerHeight-110)el.scrollIntoView({behavior:state.motion?'instant':'smooth',block:'center'})}});updateRole(cue)}
 if(cue){const progress=Math.min(100,Math.max(0,(audio.currentTime-cue.start)/(cue.end-cue.start)*100));document.querySelectorAll(`[data-line="${id}"]`).forEach(el=>el.style.setProperty('--read-progress',`${progress}%`));const word=cue.words?.find(w=>audio.currentTime>=w.start&&audio.currentTime<w.end);const key=word?`${id}:${word.index}`:'';if(key!==activeWord){document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));if(word)document.querySelectorAll(`[data-line="${id}"] [data-word="${word.index}"]`).forEach(el=>el.classList.add('word-current'));activeWord=key}}
}
function updateRole(cue){const narrator=voicesForBook().find(v=>v.id===state.voice);const actor=cue?.role&&cue.role!=='narrator'?castForBook()[cue.role]:null;$('#read-role').textContent=actor?`${actor.role[state.lang]} · ${state.lang==='ko'?actor.name:actor.nameEn}`:`${t('해설','Narrator')} · ${state.lang==='ko'?narrator.name:narrator.nameEn||narrator.name}${cue?'':t(' · 인물별 대사 목소리',' · Separate character voices')}`}
function animateHighlight(){cancelAnimationFrame(highlightFrame);const tick=()=>{updateHighlight();if(!audio.paused&&!audio.ended)highlightFrame=requestAnimationFrame(tick)};tick()}
function stopAudio(reset=true){state.token++;audio.pause();if(reset){audio.currentTime=0;clearHighlight()}updatePlayer()}
function syncAudio(){
 stopAudio();currentCues=[];audio.removeAttribute('src');audio.load();
 if(state.reader&&state.page>=0&&state.page<book.pages.length){const p=book.pages[state.page];currentCues=p.timelines?.[state.lang]?.[state.voice]||[];audio.src=p.audio[state.lang][state.voice];audio.load()}
 $('#audio-status').textContent=state.page<0?t('첫 장을 펼친 뒤 재생을 눌러 주세요','Open the first page, then press play'):t('재생을 눌러 이야기를 들어 보세요','Press play to hear the story');
 updatePlayer();
}
function updateControls(){
 $('#page-label').textContent=state.page<0?t('표지','Cover'):state.page>=book.pages.length?t('마지막 장','End'):`${t('본문','Page')} ${state.page+1} / ${book.pages.length}`;
 $('#prev').disabled=state.page<0;$('#next').disabled=state.page>=book.pages.length;
 $('#play').disabled=state.page<0||state.page>=book.pages.length;$('#restart').disabled=$('#play').disabled;$('#progress').disabled=$('#play').disabled;
 document.documentElement.lang=state.lang;
 $('.reader-name').innerHTML=`${esc(book.title[state.lang])} <span>${esc(book.title.en.toUpperCase())}</span>`;
 for(const el of document.querySelectorAll('[data-ko]'))el.textContent=el.dataset[state.lang];
 $('#lang-ko').setAttribute('aria-pressed',String(state.lang==='ko'));$('#lang-en').setAttribute('aria-pressed',String(state.lang==='en'));
 voicesForBook().forEach(v=>{$(`#voice option[value="${v.id}"]`).textContent=v.label[state.lang]});
 const selectedVoice=voicesForBook().find(v=>v.id===state.voice); $('#voice-tag').textContent=state.lang==='ko'?selectedVoice.name:(selectedVoice.nameEn||selectedVoice.name);
 $('#auto-next').setAttribute('aria-checked',String(state.autoAdvance));$('#voice').setAttribute('aria-label',t('해설 목소리','Narrator voice'));updateRole();
 $('#chapter').setAttribute('aria-label',t('목차에서 이동','Choose a chapter'));$('#chapter').replaceChildren(...[{value:-1,title:t('표지','Cover')},...book.pages.map((p,i)=>({value:i,title:`${String(i+1).padStart(2,'0')} · ${p.title[state.lang]}`})),{value:book.pages.length,title:t('책을 덮으며','The end')}].map(c=>{const o=document.createElement('option');o.value=c.value;o.textContent=c.title;return o}));$('#chapter').value=state.page;
 $('#reader-hint').textContent=t('모서리를 넘기거나 ← → 키로 이동 · Space 재생 / 일시정지 · Esc 서재','Drag a corner or use ← → · Space to play / pause · Esc for library');
 $('#prev').setAttribute('aria-label',t('이전 페이지','Previous page'));$('#next').setAttribute('aria-label',t('다음 페이지','Next page'));$('#restart').setAttribute('aria-label',t('처음부터 읽기','Read from the beginning'));$('#progress').setAttribute('aria-label',t('낭독 진행 위치','Narration position'));
}
function fmt(n){return Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00'}
function updatePlayer(){
 const playing=!audio.paused&&!audio.ended;
 $('#play').innerHTML=playing?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm7 0h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z"/></svg>';
 $('#play').setAttribute('aria-label',playing?t('낭독 일시정지','Pause narration'):t('낭독 재생','Play narration'));
 $('#time').textContent=`${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
 $('#progress').value=audio.duration?audio.currentTime/audio.duration*100:0;
 if(playing)$('#audio-status').textContent=t('이야기를 읽고 있어요','Reading the story');
 updateHighlight();
}
function notice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').hidden=true,5000)}
async function play({automatic=false}={}){
 if(!automatic)cancelAuto();
 if(state.page<0||state.page>=book.pages.length)return;
 if(!audio.paused){audio.pause();$('#audio-status').textContent=t('잠시 쉬어 가요','Paused');return}
 if(audio.ended)audio.currentTime=0;
 const token=++state.token;
 try{await audio.play();if(token!==state.token)return;updatePlayer()}
 catch(e){if(e.name==='AbortError')return;if(automatic&&e.name==='NotAllowedError'){$('#audio-status').textContent=t('다음 페이지의 재생을 눌러 주세요','Press play on the next page');return}notice(t('낭독 파일을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.','Unable to load narration. Please try again.'));$('#audio-status').textContent=t('오디오를 불러올 수 없어요','Audio unavailable')}
}
function continueAuto(){const p=pendingAuto;if(!p||p.started||!state.autoAdvance||!state.reader||state.chain!==p.chain||state.page!==p.target||state.lang!==p.lang||state.voice!==p.voice||flip.getState()!=='read')return;p.started=true;autoTimer=setTimeout(()=>{if(pendingAuto===p&&state.chain===p.chain&&state.autoAdvance&&state.reader){pendingAuto=null;play({automatic:true})}},100)}
function finishPage(){updatePlayer();if(state.autoAdvance&&state.page>=0&&state.page<book.pages.length-1){cancelAuto();pendingAuto={target:state.page+1,lang:state.lang,voice:state.voice,chain:state.chain,started:false};$('#audio-status').textContent=t('다음 장으로 넘어가요','Turning to the next page');autoTimer=setTimeout(()=>{if(pendingAuto&&state.autoAdvance&&state.reader&&audio.ended)turn(1,true)},550)}else $('#audio-status').textContent=state.autoAdvance?t('이야기를 다 읽었어요','The story is complete'):t('이 페이지의 이야기를 다 읽었어요','This page is complete')}
function turn(direction,automatic=false){if(!automatic)cancelAuto();if(!state.reader||flip.getState()==='flipping')return;const n=Math.max(-1,Math.min(book.pages.length,state.page+direction));if(n===state.page)return;stopAudio();if(direction>0)flip.flipNext('bottom');else flip.flipPrev('top')}
async function open(){
 if(state.opening||state.reader)return;state.opening=true;const epoch=++openingEpoch;$('#library').classList.add('opening');
 await new Promise(r=>setTimeout(r,state.motion?0:650));
 if(epoch!==openingEpoch||!state.opening)return;
 $('#library').hidden=true;$('#reader').hidden=false;window.scrollTo(0,0);state.reader=true;state.mobile=innerWidth<=1100;setupBook(-1);
 const openingFlip=flip;await new Promise(r=>setTimeout(r,state.motion?80:450));if(epoch!==openingEpoch)return;if(state.reader&&flip===openingFlip&&state.page===-1)flip.flipNext('bottom');state.opening=false;if(state.reader&&!$('#reader').contains(document.activeElement)){$('#reader').tabIndex=-1;$('#reader').focus({preventScroll:true})}
}
function back(){if(!state.reader&&!state.opening)return;openingEpoch++;state.opening=false;cancelAuto();stopAudio();currentCues=[];audio.removeAttribute('src');audio.load();state.reader=false;$('#reader').classList.remove('has-started');$('#reader').hidden=true;$('#library').hidden=false;$('#library').classList.remove('opening');window.scrollTo(0,0);$('#open-book').focus({preventScroll:true})}
$('#open-book').addEventListener('click',open);$('#back').addEventListener('click',back);$('#brand').addEventListener('click',e=>{e.preventDefault();back()});
$('#next').addEventListener('click',()=>turn(1));$('#prev').addEventListener('click',()=>turn(-1));$('#play').addEventListener('click',play);
$('#chapter').addEventListener('change',e=>{cancelAuto();stopAudio();const target=Number(e.target.value);if(Number.isInteger(target)&&target>=-1&&target<=book.pages.length){flip.turnToPage(leafIndex(target));state.page=target;syncAudio();updateControls();window.scrollTo({top:0,behavior:state.motion?'instant':'smooth'})}});
$('#restart').addEventListener('click',()=>{cancelAuto();stopAudio();play()});
$('#progress').addEventListener('input',e=>{cancelAuto();if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/100;updatePlayer()});
$('#voice').addEventListener('change',e=>{cancelAuto();stopAudio();state.voice=e.target.value;syncAudio();updateControls()});
for(const lang of ['ko','en'])$('#lang-'+lang).addEventListener('click',()=>{if(state.lang===lang)return;cancelAuto();stopAudio();state.lang=lang;setupBook(state.page)});
$('#auto-next').addEventListener('click',()=>{state.autoAdvance=!state.autoAdvance;if(!state.autoAdvance)cancelAuto();$('#auto-next').setAttribute('aria-checked',String(state.autoAdvance));try{localStorage.setItem('woodland.autoAdvance',String(state.autoAdvance))}catch{}});
audio.addEventListener('timeupdate',updatePlayer);audio.addEventListener('loadedmetadata',updatePlayer);audio.addEventListener('play',()=>{$('#reader').classList.add('has-started');activeLine='';updatePlayer();animateHighlight()});audio.addEventListener('pause',()=>{cancelAnimationFrame(highlightFrame);updatePlayer()});audio.addEventListener('seeked',updateHighlight);audio.addEventListener('ended',finishPage);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.opening){e.preventDefault();back();return}if(!state.reader||e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();turn(1)}if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();play()}if(e.key==='Escape'){e.preventDefault();back()}});
function motion(value){state.motion=value;document.body.classList.toggle('reduce-motion',value);$('#motion').setAttribute('aria-pressed',String(value));if(flip)flip.getSettings().flippingTime=value?80:950}
motion(state.motion);$('#motion').addEventListener('click',()=>motion(!state.motion));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>motion(e.matches));
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!state.reader||innerWidth===lastViewportWidth)return;cancelAuto();stopAudio();state.mobile=innerWidth<=1100;setupBook(state.page)},250)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAuto();stopAudio(false)}});
window.addEventListener('pagehide',()=>{cancelAuto();stopAudio()});
$('.reading-desk').addEventListener('pointermove',e=>{if(state.motion||e.pointerType==='touch')return;const r=e.currentTarget.getBoundingClientRect();document.documentElement.style.setProperty('--px',`${(e.clientX-r.left-r.width/2)/70}px`);document.documentElement.style.setProperty('--py',`${(e.clientY-r.top-r.height/2)/70}px`)});
$('.reading-desk').addEventListener('pointerdown',cancelAuto);
// Mobile illustration swipes invoke the engine's page animation directly.
// Keep vertical reading scroll native; desktop retains the engine's fold drag.
let illustrationSwipe,desktopPointer;
$('.reading-desk').addEventListener('pointerdown',e=>{
 desktopPointer=!state.mobile&&e.isPrimary?e.pointerId:null;
 illustrationSwipe=state.mobile&&e.isPrimary&&e.target.closest('.art')?{x:e.clientX,y:e.clientY,page:state.page,at:performance.now(),id:e.pointerId}:null;
});
document.addEventListener('pointerup',e=>{
 // Some pointer devices coalesce their last move before mouseup. Supply that
 // final position through the pinned engine's public user-move/stop methods.
 if(desktopPointer===e.pointerId&&!state.mobile&&flip?.getState()==='user_fold'){
  const r=$('#flipbook .stf__block').getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top};
  flip.userMove(p,false);flip.userStop(p);
 }
 desktopPointer=null;
 const s=illustrationSwipe;illustrationSwipe=null;
 if(!s||e.pointerId!==s.id||!state.reader||!state.mobile||state.page!==s.page||performance.now()-s.at>1800)return;
 const dx=e.clientX-s.x,dy=e.clientY-s.y;
 if(Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.6&&flip.getState()==='read')turn(dx<0?1:-1);
});
document.addEventListener('pointercancel',()=>illustrationSwipe=null);
// Read-only diagnostics for repeatable QA; production interaction uses the controls above.
window.storybook={snapshot:()=>({...state,audio:{src:audio.getAttribute('src'),paused:audio.paused,time:audio.currentTime,duration:audio.duration,error:audio.error?.code??null},leaf:flip?.getCurrentPageIndex(),orientation:flip?.getOrientation()})};

