const $=s=>document.querySelector(s);
const dataURL=new URL('./books.json',import.meta.url);dataURL.search=new URL(import.meta.url).search;
const data=await fetch(dataURL).then(r=>{if(!r.ok)throw Error('Book data unavailable');return r.json()});
let book=data.books[0];
const voicesForBook=()=>book.voices||data.voices;
const castForBook=()=>book.cast||data.cast||{};
const audio=$('#narration');
let savedAuto=false;try{savedAuto=localStorage.getItem('woodland.autoAdvance')==='true'}catch{}
const state={lang:'ko',voice:'female',page:-1,reader:false,mobile:innerWidth<=1100,opening:false,motion:matchMedia('(prefers-reduced-motion: reduce)').matches,token:0,autoAdvance:savedAuto,chain:0};
const getStored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem('woodland.'+key))??fallback}catch{return fallback}};
const store=(key,value)=>{try{localStorage.setItem('woodland.'+key,JSON.stringify(value))}catch{}};
const prefs=getStored('readerPrefs',{});
state.rate=[.75,1,1.25,1.5,1.75,2].includes(prefs.rate)?prefs.rate:1;
state.font=[16,18,20,22,24].includes(prefs.font)?prefs.font:18;
state.follow=prefs.follow!==false;state.theme=prefs.theme==='night'?'night':'paper';
state.motion=state.motion||prefs.motion===true;
let resumeTime=null,sleepTimer=null,sleepDeadline=null,sleepMode='off',saveStamp=0;
function savePrefs(){store('readerPrefs',{rate:state.rate,font:state.font,follow:state.follow,theme:state.theme,motion:state.motion})}
function savePosition(){if(state.reader&&state.page>=0&&state.page<book.pages.length)store('position.'+book.id,{page:state.page,time:audio.ended?0:audio.currentTime,lang:state.lang,voice:state.voice,updated:Date.now()})}
function applyPrefs(){document.documentElement.style.setProperty('--reading-size',state.font+'px');document.body.dataset.theme=state.theme;$('#speed').value=state.rate;$('#theme').value=state.theme;$('#font-value').value=state.font;$('#font-down').disabled=state.font<=16;$('#font-up').disabled=state.font>=24;$('#follow').setAttribute('aria-checked',String(state.follow));audio.playbackRate=state.rate;audio.preservesPitch=true;}
let flip,resizeTimer,noticeTimer,autoTimer,pendingAuto,highlightFrame,currentCues=[],activeLine='',activeWord='',lastViewportWidth=innerWidth,lastViewportHeight=innerHeight,openingEpoch=0;
const t=(ko,en)=>state.lang==='ko'?ko:en;
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderShelf(){
 const front=$('.shelf-book .cover-face');front.querySelector('img').src=book.cover;front.querySelector('img').alt=`${book.title.ko} 수채화 표지`;
 front.querySelector('.cover-type').classList.toggle('bottom',book.coverLayout==='bottom');front.querySelector('strong').textContent=book.title.ko;front.querySelector('em').textContent=book.title.en;front.querySelector('.cover-type>span').textContent=book.subtitle.ko;
 $('#open-book').setAttribute('aria-label',`${book.title.ko} 책 펼치기`);$('.feature-note small').textContent=`${book.title.ko} · ${book.subtitle.ko}`;
 $('.shelf-caption>span').textContent=book.author.ko;
 $('#extra-books').hidden=data.books.length<2;$('#extra-books').style.setProperty('--volumes',data.books.length);
 $('#extra-books').replaceChildren(...data.books.map(b=>{const btn=document.createElement('button');btn.innerHTML=`<span class="mini-spine"></span><span class="mini-cover"><img src="${esc(b.cover)}" alt="" loading="lazy"><span>${esc(b.title.ko)}</span></span><span class="mini-caption">${esc(b.title.ko)}<small>${esc(b.title.en)}</small></span>`;btn.setAttribute('aria-label',`${b.title.ko} 책 펼치기`);btn.setAttribute('aria-pressed',String(b.id===book.id));btn.addEventListener('click',()=>{book=b;renderShelf();open()});return btn}));
 renderResume();
 document.title=`숲속의 서재 — ${book.title.ko}`;$('#reader').setAttribute('aria-label',`${book.title.ko} 동화책`);$('.library-footer').lastElementChild.textContent=`한국어 & English · 해설과 인물 대사 · ${data.books.length}권의 이야기`; 
}
function renderResume(){const recent=data.books.map(b=>({book:b,position:getStored('position.'+b.id,null)})).filter(r=>r.position&&Number.isInteger(r.position.page)&&r.position.page>=0&&r.position.page<r.book.pages.length).sort((a,b)=>(Number(b.position.updated)||0)-(Number(a.position.updated)||0))[0];const button=$('#resume-reading');button.hidden=!recent;button.dataset.book=recent?.book.id||'';button.textContent=recent?`${recent.book.title.ko} · ${recent.position.page+1}장 이어 읽기`:'이어 읽기';}
renderShelf();
function cover(){return `<div class="book-page page-cover" data-density="hard"><img src="${book.cover}" alt="${esc(book.title[state.lang]+' '+t('표지','cover'))}"><div class="cover-type ${book.coverLayout==='bottom'?'bottom':''}"><small>THE WOODLAND CLASSICS</small><strong>${book.title[state.lang]}</strong><em>${esc(book.title.en)}</em><span>${book.subtitle[state.lang]}</span></div><span class="cover-frame"></span></div>`}
function art(p){return `<div class="art ${p.motion}" style="--scene-image:url('${esc(p.image)}')"><img class="art-base" src="${p.image}" alt="${esc(p.alt[state.lang])}" draggable="false"><span class="cloud"></span><span class="light-wash"></span><span class="leaf"></span><span class="leaf l2"></span><span class="leaf l3"></span><span class="firefly"></span><span class="firefly f2"></span><span class="art-foreground"></span><span class="illustration-credit">THE WOODLAND LIBRARY</span></div>`}
function readingText(p){
 const lines=p.lines?.[state.lang];if(!lines)return p.paragraphs[state.lang].map(s=>`<p>${esc(s)}</p>`).join('');
 return [0,1,2].map(paragraph=>`<p>${lines.filter(l=>l.paragraph===paragraph).map(l=>{let word=0;return `<span class="read-line" data-line="${l.id}" data-role="${l.role}">${l.text.split(/(\s+)/).map(s=>/^\s+$/.test(s)?s:`<span class="read-word" data-word="${word++}">${esc(s)}</span>`).join('')}</span>`}).join(' ')}</p>`).join('');
}
function text(p,i){return `<article class="text-page" lang="${state.lang}"><p class="chapter-no">${String(i+1).padStart(2,'0')}</p><span class="chapter-kicker">${esc(book.id.toUpperCase())} · ${esc(p.id.replaceAll('-',' ').toUpperCase())}</span><h2>${p.title[state.lang]}</h2><div class="story-text" tabindex="0" role="region" aria-label="${t('이야기 본문','Story text')}">${readingText(p)}</div><span class="folio">${i+1}</span></article>`}
function leafIndex(page){return page<0?0:state.mobile?page+1:page*2+1}
function narrative(index){if(index===0)return -1;return state.mobile?index-1:Math.floor((index-1)/2)}
function setupBook(target=-1){
 // Language changes may rebuild before the debounced resize handler runs.
 state.mobile=innerWidth<=1100;
 lastViewportWidth=innerWidth;lastViewportHeight=innerHeight;
 destroyBook();document.body.classList.remove('turning-page');
 const el=$('#flipbook');
 el.innerHTML=cover()+book.pages.map((p,i)=>state.mobile?`<div class="book-page"><div class="mobile-leaf ${book.mobileImageRatio?'full-scene':''}">${art(p)}${text(p,i)}</div></div>`:`<div class="book-page">${art(p)}</div><div class="book-page">${text(p,i)}</div>`).join('')+`<div class="book-page" data-density="hard"><div class="end-leaf"><div><span class="chapter-kicker">THE END</span><h2>${t('그리고, 새로운 내일.','A new tomorrow.')}</h2><p>${t(esc(book.title.ko)+'의 이야기를 끝까지 읽었어요.<br>서재로 돌아가거나, 다시 펼쳐 보세요.','You have reached the end of '+esc(book.title.en)+'.<br>Return to the library, or read it again.')}</p></div></div></div>`;
 const available=$('.reading-desk').clientWidth;
 const w=state.mobile?Math.min(available-24,680):Math.min(570,(available-48)/2);
 const h=Math.max(180,Math.floor($('.reading-desk').clientHeight-16));
 $('.book-rest').style.width=`${state.mobile?w:w*2}px`;
 $('.book-rest').style.height=`${h}px`;
 flip=new St.PageFlip(el,{width:w,height:h,size:'fixed',showCover:true,usePortrait:true,startPage:leafIndex(target),drawShadow:true,maxShadowOpacity:.38,flippingTime:state.motion?80:700,mobileScrollSupport:false,swipeDistance:35,clickEventForward:true,useMouseEvents:!state.mobile,showPageCorners:!state.mobile&&!state.motion,disableFlipByClick:true});
 const thisFlip=flip;flip.on('flip',e=>{if(thisFlip!==flip||!state.reader)return;const n=narrative(e.data);if(n!==state.page){stopAudio();state.page=n;syncAudio()}updateControls();warmPages();queueMicrotask(continueAuto)});
 flip.on('changeState',e=>{if(thisFlip!==flip||!state.reader)return;if(e.data==='flipping'){document.body.classList.add('turning-page');window.readerPerf?.start();stopAudio()}if(e.data==='read'){document.body.classList.remove('turning-page');window.readerPerf?.end();queueMicrotask(continueAuto)}});
 flip.loadFromHTML(el.querySelectorAll('.book-page'));
 state.page=target;updateControls();syncAudio();
}
// Reuse the current book for chapter jumps; rebuilding is reserved for layout/language.
function jumpTo(target){
 openingEpoch++;state.opening=false;cancelAuto();stopAudio();
 flip.getRender().finishAnimation();flip.turnToPage(leafIndex(target));
 document.body.classList.remove('turning-page');
 if(state.page!==target){state.page=target;syncAudio();updateControls()}
}
function destroyBook(){
 if(!flip)return;const old=flip;flip=null;old.destroy();
 const el=document.createElement('div');el.id='flipbook';$('.book-rest').replaceChildren(el);
 document.body.classList.remove('turning-page');window.readerPerf?.end();
}
function warmPages(){
 for(const i of [state.page-1,state.page,state.page+1]){const p=book.pages[i];if(!p)continue;
  const img=document.querySelector(`.art-base[src="${p.image}"]`);if(img)img.decode().catch(()=>{});
 }
}
function cancelAuto(){clearTimeout(autoTimer);pendingAuto=null;state.chain++}
function clearHighlight(){cancelAnimationFrame(highlightFrame);document.querySelectorAll('.read-active').forEach(el=>{el.classList.remove('read-active');el.removeAttribute('aria-current');el.style.removeProperty('--read-progress')});document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));activeLine='';activeWord=''}
function updateHighlight(){
 const cue=currentCues.find(c=>audio.currentTime>=c.start&&audio.currentTime<c.end);
 const id=cue?.lineId||'';
 if(id!==activeLine){document.querySelectorAll('.read-active').forEach(el=>{el.classList.remove('read-active');el.removeAttribute('aria-current')});activeLine=id;activeWord='';document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));if(id)document.querySelectorAll(`[data-line="${id}"]`).forEach(el=>{el.classList.add('read-active');el.setAttribute('aria-current','true');if(state.follow&&!audio.paused){const pane=el.closest('.story-text'),r=el.getBoundingClientRect(),p=pane.getBoundingClientRect();if(r.top<p.top+8||r.bottom>p.bottom-8)pane.scrollTo({top:pane.scrollTop+r.top-p.top-16,behavior:state.motion?'instant':'smooth'})}});updateRole(cue)}
 if(cue){const progress=Math.min(100,Math.max(0,(audio.currentTime-cue.start)/(cue.end-cue.start)*100));document.querySelectorAll(`[data-line="${id}"]`).forEach(el=>el.style.setProperty('--read-progress',`${progress}%`));const word=cue.words?.find(w=>audio.currentTime>=w.start&&audio.currentTime<w.end);const key=word?`${id}:${word.index}`:'';if(key!==activeWord){document.querySelectorAll('.word-current').forEach(el=>el.classList.remove('word-current'));if(word)document.querySelectorAll(`[data-line="${id}"] [data-word="${word.index}"]`).forEach(el=>{el.classList.add('word-current');if(state.follow&&!audio.paused){const pane=el.closest('.story-text'),r=el.getBoundingClientRect(),p=pane.getBoundingClientRect();if(r.top<p.top+4||r.bottom>p.bottom-4)pane.scrollTo({top:pane.scrollTop+r.top-p.top-16,behavior:state.motion?'instant':'smooth'})}});activeWord=key}}
}
function updateRole(cue){const narrator=voicesForBook().find(v=>v.id===state.voice);const actor=cue?.role&&cue.role!=='narrator'?castForBook()[cue.role]:null;$('#read-role').textContent=actor?`${actor.role[state.lang]} · ${state.lang==='ko'?actor.name:actor.nameEn}`:`${t('해설','Narrator')} · ${state.lang==='ko'?narrator.name:narrator.nameEn||narrator.name}${cue?'':t(' · 인물별 대사 목소리',' · Separate character voices')}`}
function animateHighlight(){cancelAnimationFrame(highlightFrame);const tick=()=>{updateHighlight();if(!audio.paused&&!audio.ended)highlightFrame=requestAnimationFrame(tick)};tick()}
function stopAudio(reset=true){state.token++;audio.pause();if(reset){audio.currentTime=0;clearHighlight()}updatePlayer()}
function syncAudio(){
 stopAudio();document.querySelectorAll('.story-text').forEach(el=>el.scrollTop=0);currentCues=[];audio.removeAttribute('src');audio.load();
 if(state.reader&&state.page>=0&&state.page<book.pages.length){const p=book.pages[state.page];currentCues=p.timelines?.[state.lang]?.[state.voice]||[];audio.src=p.audio[state.lang][state.voice];audio.load();audio.playbackRate=state.rate}
 $('#audio-status').textContent=state.page<0?t('첫 장을 펼친 뒤 재생을 눌러 주세요','Open the first page, then press play'):t('재생을 눌러 이야기를 들어 보세요','Press play to hear the story');
 updatePlayer();
}
function updateControls(){
 $('#page-label').textContent=state.page<0?t('표지','Cover'):state.page>=book.pages.length?t('마지막 장','End'):`${t('본문','Page')} ${state.page+1} / ${book.pages.length}`;
 $('#image-open').hidden=state.page>=book.pages.length;$('#skip-back').disabled=state.page<0||state.page>=book.pages.length;$('#skip-forward').disabled=$('#skip-back').disabled;
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
 $('#skip-back').setAttribute('aria-label',t('10초 뒤로','Back 10 seconds'));$('#skip-forward').setAttribute('aria-label',t('10초 앞으로','Forward 10 seconds'));$('#speed').setAttribute('aria-label',t('낭독 속도','Playback speed'));
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
function finishPage(){updatePlayer();savePosition();if(sleepMode==='chapter'){clearSleep();cancelAuto();$('#audio-status').textContent=t('이 장을 마치고 쉬어 가요','Resting at the end of this chapter');return}if(state.autoAdvance&&state.page>=0&&state.page<book.pages.length-1){cancelAuto();pendingAuto={target:state.page+1,lang:state.lang,voice:state.voice,chain:state.chain,started:false};$('#audio-status').textContent=t('다음 장으로 넘어가요','Turning to the next page');autoTimer=setTimeout(()=>{if(pendingAuto&&state.autoAdvance&&state.reader&&audio.ended)turn(1,true)},550)}else $('#audio-status').textContent=state.autoAdvance?t('이야기를 다 읽었어요','The story is complete'):t('이 페이지의 이야기를 다 읽었어요','This page is complete')}
function turn(direction,automatic=false){if(!automatic)cancelAuto();if(!state.reader||flip.getState()==='flipping')return;const n=Math.max(-1,Math.min(book.pages.length,state.page+direction));if(n===state.page)return;stopAudio();if(direction>0)flip.flipNext('bottom');else flip.flipPrev('top')}
async function open(resume=false){
 if(state.opening||state.reader)return;const saved=resume===true?getStored('position.'+book.id,null):null;if(saved&&Number.isInteger(saved.page)&&saved.page>=0&&saved.page<book.pages.length){state.lang=['ko','en'].includes(saved.lang)?saved.lang:'ko';state.voice=['female','male'].includes(saved.voice)?saved.voice:'female';resumeTime=Number.isFinite(saved.time)?Math.max(0,saved.time):0}else resumeTime=null;state.opening=true;const epoch=++openingEpoch;$('#library').classList.add('opening');
 await new Promise(r=>setTimeout(r,state.motion?0:650));
 if(epoch!==openingEpoch||!state.opening)return;
 $('#library').hidden=true;$('#reader').hidden=false;window.scrollTo(0,0);state.reader=true;document.body.classList.add('reading');state.mobile=innerWidth<=1100;setupBook(saved?Math.min(saved.page,book.pages.length-1):-1);
 const openingFlip=flip;await new Promise(r=>setTimeout(r,state.motion?80:450));if(epoch!==openingEpoch)return;if(state.reader&&flip===openingFlip&&state.page===-1)flip.flipNext('bottom');state.opening=false;if(state.reader&&!$('#reader').contains(document.activeElement)){$('#reader').tabIndex=-1;$('#reader').focus({preventScroll:true})}
}
function back(){if(!state.reader&&!state.opening)return;savePosition();clearSleep();document.body.classList.remove('reading');openingEpoch++;state.opening=false;cancelAuto();stopAudio();currentCues=[];audio.removeAttribute('src');audio.load();state.reader=false;destroyBook();$('#reader').classList.remove('has-started');$('#reader').hidden=true;$('#library').hidden=false;$('#library').classList.remove('opening');window.scrollTo(0,0);renderResume();$('#open-book').focus({preventScroll:true})}
$('#open-book').addEventListener('click',()=>open());$('#resume-reading').addEventListener('click',()=>{book=data.books.find(b=>b.id===$('#resume-reading').dataset.book)||book;renderShelf();open(true)});$('#back').addEventListener('click',back);$('#brand').addEventListener('click',e=>{e.preventDefault();back()});
$('#next').addEventListener('click',()=>turn(1));$('#prev').addEventListener('click',()=>turn(-1));$('#play').addEventListener('click',play);
$('#chapter').addEventListener('change',e=>{cancelAuto();stopAudio();const target=Number(e.target.value);if(Number.isInteger(target)&&target>=-1&&target<=book.pages.length){jumpTo(target);window.scrollTo({top:0,behavior:state.motion?'instant':'smooth'})}});
$('#restart').addEventListener('click',()=>{closeSettings();cancelAuto();stopAudio();play()});
$('#progress').addEventListener('input',e=>{cancelAuto();if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*e.target.value/100;updatePlayer()});
$('#voice').addEventListener('change',e=>{cancelAuto();stopAudio();state.voice=e.target.value;syncAudio();updateControls()});
for(const lang of ['ko','en'])$('#lang-'+lang).addEventListener('click',()=>{if(state.lang===lang)return;cancelAuto();stopAudio();state.lang=lang;setupBook(state.page)});
$('#auto-next').addEventListener('click',()=>{state.autoAdvance=!state.autoAdvance;if(!state.autoAdvance)cancelAuto();$('#auto-next').setAttribute('aria-checked',String(state.autoAdvance));try{localStorage.setItem('woodland.autoAdvance',String(state.autoAdvance))}catch{}});
audio.addEventListener('timeupdate',()=>{updatePlayer();if(Date.now()-saveStamp>2000){savePosition();saveStamp=Date.now()}});audio.addEventListener('loadedmetadata',()=>{audio.playbackRate=state.rate;if(resumeTime!==null&&Number.isFinite(audio.duration)){audio.currentTime=Math.min(resumeTime,Math.max(0,audio.duration-.1));resumeTime=null}updatePlayer()});audio.addEventListener('play',()=>{$('#reader').classList.add('has-started');activeLine='';updatePlayer();animateHighlight()});audio.addEventListener('pause',()=>{savePosition();cancelAnimationFrame(highlightFrame);updatePlayer()});audio.addEventListener('seeked',updateHighlight);audio.addEventListener('ended',finishPage);
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&state.opening){e.preventDefault();back();return}if(!state.reader||e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();turn(1)}if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();play()}if(e.key==='Escape'){e.preventDefault();back()}});
function motion(value){state.motion=value;document.body.classList.toggle('reduce-motion',value);$('#motion').setAttribute('aria-pressed',String(value));$('#reader-motion').setAttribute('aria-checked',String(value));savePrefs();if(flip)flip.getSettings().flippingTime=value?80:700}
applyPrefs();motion(state.motion);$('#motion').addEventListener('click',()=>motion(!state.motion));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>motion(e.matches));
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!state.reader||(lastViewportWidth===innerWidth&&lastViewportHeight===innerHeight))return;const time=audio.currentTime,playing=!audio.paused;cancelAuto();resumeTime=time;setupBook(state.page);if(playing)play()},200)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){savePosition();cancelAuto();stopAudio(false)}});
window.addEventListener('pagehide',()=>{savePosition();cancelAuto();stopAudio(false)});
$('.reading-desk').addEventListener('pointermove',e=>{if(state.motion||e.pointerType==='touch'||flip?.getState()==='flipping')return;const r=e.currentTarget.getBoundingClientRect();document.documentElement.style.setProperty('--px',`${(e.clientX-r.left-r.width/2)/70}px`);document.documentElement.style.setProperty('--py',`${(e.clientY-r.top-r.height/2)/70}px`)});
$('.reading-desk').addEventListener('pointerdown',cancelAuto);
// Mobile illustration swipes invoke the engine's page animation directly.
// Keep vertical reading scroll native; desktop retains the engine's fold drag.
let illustrationSwipe,desktopPointer;
$('.reading-desk').addEventListener('pointerdown',e=>{
 desktopPointer=!state.mobile&&e.isPrimary&&e.target.closest('.art')?e.pointerId:null;
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


// Controls share one audio element and the source-time cues, including at non-1x speed.
$('#speed').addEventListener('change',e=>{state.rate=Number(e.target.value);audio.playbackRate=state.rate;audio.preservesPitch=true;savePrefs()});
for(const [id,delta] of [['skip-back',-10],['skip-forward',10]])$('#'+id).addEventListener('click',()=>{cancelAuto();if(Number.isFinite(audio.duration)){audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta));updatePlayer();savePosition()}});
function closeSettings(){$('#settings').close();$('#settings-open').focus({preventScroll:true})}
$('#settings-open').addEventListener('click',()=>$('#settings').showModal());$('#settings-close').addEventListener('click',closeSettings);
$('#settings').addEventListener('cancel',()=>$('#settings-open').focus({preventScroll:true}));
for(const [id,delta] of [['font-down',-2],['font-up',2]])$('#'+id).addEventListener('click',()=>{state.font=Math.max(16,Math.min(24,state.font+delta));applyPrefs();savePrefs()});
$('#theme').addEventListener('change',e=>{state.theme=e.target.value;applyPrefs();savePrefs()});
$('#follow').addEventListener('click',()=>{state.follow=!state.follow;applyPrefs();savePrefs();activeLine='';updateHighlight()});
$('#reader-motion').addEventListener('click',()=>motion(!state.motion));
$('#start-over').addEventListener('click',()=>{closeSettings();cancelAuto();stopAudio();jumpTo(0);savePosition()});
function clearSleep(){clearTimeout(sleepTimer);sleepTimer=null;sleepDeadline=null;sleepMode='off';$('#sleep').value='off';$('#sleep-status').hidden=true;}
$('#sleep').addEventListener('change',e=>{const value=e.target.value;clearSleep();sleepMode=value;$('#sleep').value=value;$('#sleep-status').hidden=value==='off';$('#sleep-status').textContent=value==='chapter'?t('이 장 끝에 쉼','Rest after chapter'):value+' min';if(['15','30'].includes(value)){sleepDeadline=Date.now()+Number(value)*60000;sleepTimer=setTimeout(()=>{cancelAuto();stopAudio(false);clearSleep();notice(t('취침 타이머가 끝났어요','Sleep timer finished'))},Number(value)*60000)}});
$('#image-open').addEventListener('click',()=>{const p=book.pages[state.page];$('#large-art').src=p?p.image:book.cover;$('#large-art').alt=p?p.alt[state.lang]:book.title[state.lang];$('#large-art-caption').textContent=p?p.title[state.lang]:book.title[state.lang];$('#art-dialog').showModal()});
$('#image-close').addEventListener('click',()=>{$('#art-dialog').close();$('#image-open').focus({preventScroll:true})});
