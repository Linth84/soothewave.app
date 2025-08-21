// ===== helpers =====
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
const wait = (ms)=>new Promise(r=>setTimeout(r, ms));

// ===== elementos =====
const circle       = $("#circle");
const instruction  = $("#instruction");
const modeSel      = $("#mode");
const startBtn     = $("#startBtn");
const stopBtn      = $("#stopBtn");
const soundToggle  = $("#soundToggle");
const volumeEl     = $("#volume");
const langBtn      = $("#langBtn");

// tabs
const tabBreath    = $("#tab-breath");
const tabAnchor    = $("#tab-anchor");

// selector/contador
const sessionControls = $("#sessionControls");
const sessionSel   = $("#sessionMinutes");
const countdownBox = $("#countdownBox");
const countdownLbl = $("#countdownLabel");
const countdownEl  = $("#countdown");

// blackout / overlay final
const blackout     = $("#blackout");

// anclaje
const anchorTitle = $("#anchorTitle");
const progressFill = document.getElementById("progressFill");
const anchorProgress = $("#anchorProgress");
const groundPrompt = $("#groundPrompt");
const groundHintTitle = $("#groundHintTitle");
const groundHintsUl = $("#groundHintsList");
const groundInputs = $("#groundInputs");
const groundInput = $("#groundInput");
const prevStepBtn = $("#prevStep");
const nextStepBtn = $("#nextStep");
const restartBtn  = $("#restartSteps");
const prevTxt = $("#prevTxt");
const nextTxt = $("#nextTxt");
const restartTxt = $("#restartTxt");
const groundDone = $("#groundDone");
const doneTitleEl = $("#doneTitle");
const howFeelEl = $("#howFeel");
const feelGoodBtn = $("#feelGood");
const feelBadBtn  = $("#feelBad");
const goBreatheBtn= $("#goBreathe");
const feelMsgEl   = $("#feelMsg");
const restartFinalBtn = $("#restartFinal");

// ===== estado =====
let breathingRunning = false;
let breathingLoopPromise = null;
let countdownIntervalId = null;
let audioFadeStarted = false;

// ===== Audio cues =====
let audioCtx=null, gainNode=null;
function ensureAudio(){
  if(audioCtx) return;
  const Ctx = window.AudioContext||window.webkitAudioContext;
  if(!Ctx) return;
  audioCtx = new Ctx();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = parseFloat(volumeEl.value||"0.6");
  gainNode.connect(audioCtx.destination);
}
function beep(freq=392,dur=0.15){
  if(!soundToggle.checked) return;
  ensureAudio();
  if(!audioCtx||!gainNode) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq; o.type="sine";
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gainNode.gain.value, now+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  o.connect(g); g.connect(gainNode); o.start(now); o.stop(now+dur);
}
function fadeMasterGain(seconds=8){
  if(!gainNode||!audioCtx) return;
  const now=audioCtx.currentTime;
  const start = gainNode.gain.value;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(start, now);
  gainNode.gain.linearRampToValueAtTime(0.0, now + seconds);
}

// ===== idioma =====
let currentLang="es";
const T={
  es:{
    app:"SootheWaveApp",
    startLabel:"Iniciar",
    stopLabel:"Detener",
    pressStart:"Presiona iniciar", inhale:"Inhala", hold:"Mantén", exhale:"Exhala", left:"Quedan",
    sound:"Sonido", breath:"Respiración", anchor:"Anclaje",
    mode:"Modo:", relax:"Relajación (4-4)", calm:"Calma (4-6)", sleep:"Dormir (4-7-8)", duration:"Duración:",
    gTitle:"Ejercicio de Anclaje",
    steps:[
      {label:"5 cosas que veas", hints:["Colores, objetos, luz/sombra, formas."]},
      {label:"4 cosas que sientas", hints:["Ropa sobre la piel, soporte de la silla, temperatura, textura."]},
      {label:"3 cosas que escuches", hints:["Sonidos lejanos, tráfico, viento, una voz, electrodomésticos."]},
      {label:"2 cosas que huelas",  hints:["Café, jabón, perfume, aire fresco."]},
      {label:"1 cosa que saborees", hints:["Agua, menta, sabor en la boca ahora."]}
    ],
    optWrite:"Escribe aquí si quieres (opcional):",
    needIdeas:"¿Necesitas ideas?",
    prev:"Anterior", next:"Siguiente", restart:"Reiniciar",
    doneTitle:"¡Completaste el ejercicio!", howFeel:"¿Cómo te sientes ahora?",
    good:"Me siento bien", bad:"Todavía me siento mal", breatheNow:"Respirar ahora",
    goodNight:"Buenas noches",
    speakAloud:"Puedes decirlas en voz alta o escribirlas.",
    placeholder:"Ej.: taza azul, luz tenue, sonido de la calle."
  },
  en:{
    app:"SootheWaveApp",
    startLabel:"Start",
    stopLabel:"Stop",
    pressStart:"Press start", inhale:"Inhale", hold:"Hold", exhale:"Exhale", left:"Left",
    sound:"Sound", breath:"Breathing", anchor:"Grounding",
    mode:"Mode:", relax:"Relaxation (4-4)", calm:"Calm (4-6)", sleep:"Sleep (4-7-8)", duration:"Duration:",
    gTitle:"Grounding Exercise",
    steps:[
      {label:"5 things you can see", hints:["Colors, shapes, objects, light, shadows."]},
      {label:"4 things you can feel", hints:["Clothes, chair, temperature, texture of an object."]},
      {label:"3 things you can hear", hints:["Distant sounds, traffic, wind, voices, appliances."]},
      {label:"2 things you can smell", hints:["Coffee, soap, perfume, fresh air."]},
      {label:"1 thing you can taste", hints:["Water, mint, current taste."]}
    ],
    optWrite:"Write here if you want (optional):",
    needIdeas:"Need ideas?",
    prev:"Previous", next:"Next", restart:"Restart",
    doneTitle:"You completed the exercise!", howFeel:"How do you feel now?",
    good:"I feel good", bad:"I still feel bad", breatheNow:"Breathe now",
    goodNight:"Good night",
    speakAloud:"You can say them out loud or write them.",
    placeholder:"E.g.: blue cup, dim light, street noise."
  }
};
function applyLang(){
  const l=T[currentLang];
  document.title = l.app;
  $("#title").textContent = l.app;
  $("#soundLabel").textContent = currentLang==="es" ? "Sonido" : "Sound";
  $("#tab-breath").textContent = l.breath;
  $("#tab-anchor").textContent = l.anchor;
  $("#modeLabel").textContent = l.mode;
  $("#sessionLabel").textContent = l.duration;
  countdownLbl.textContent = l.left;
  if(modeSel.options[0]) modeSel.options[0].text = l.relax;
  if(modeSel.options[1]) modeSel.options[1].text = l.calm;
  if(modeSel.options[2]) modeSel.options[2].text = l.sleep;
  instruction.textContent = l.pressStart;

  if (startBtn) startBtn.textContent = l.startLabel;
  if (stopBtn)  stopBtn.textContent  = l.stopLabel;

  anchorTitle.textContent = l.gTitle;
  $("#groundInputLabel").textContent = l.optWrite;
  groundHintTitle.textContent = l.needIdeas;
  $("#prevTxt").textContent = l.prev;
  $("#nextTxt").textContent = l.next;
  $("#restartTxt").textContent = l.restart;
  const restartFinalEl = document.getElementById("restartFinal");
  if (restartFinalEl) restartFinalEl.textContent = l.restart;

  doneTitleEl.textContent = l.doneTitle;
  howFeelEl.textContent = l.howFeel;
  $("#feelGood").textContent = l.good;
  $("#feelBad").textContent  = l.bad;
  $("#goBreathe").textContent= l.breatheNow;

  const speakEl = document.getElementById("speakAloud");
  if (speakEl) speakEl.textContent = l.speakAloud;
  if (groundInput) groundInput.placeholder = l.placeholder;

  langBtn.textContent = currentLang.toUpperCase();
  if (typeof renderStep === "function") renderStep();
}
langBtn?.addEventListener("click", ()=>{
  currentLang = currentLang==="es" ? "en" : "es";
  applyLang();
});

// ===== safe-area & viewport fix =====
function setVHVar(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVHVar);
window.addEventListener('orientationchange', setVHVar);
setVHVar();

// ===== Buenas noches =====
async function showGoodNightThenExit(){
  // Usar overlay/cierre nativo si existe
  if (window.AndroidBridge && typeof AndroidBridge.onSessionEnded === 'function') {
    AndroidBridge.onSessionEnded();
    return;
  }
  // Fallback web
  blackout.style.transitionDuration = '0.8s';
  blackout.classList.add('active');
  const style = document.createElement('style');
  style.textContent = `
    #blackout.active .gn-msg{
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      text-align:center; padding:24px;
      font-family: 'Montserrat', system-ui, sans-serif; font-weight:700;
      font-size: clamp(28px, 6vw, 44px); color:#fff; letter-spacing:.5px;
      background:#000;
    }`;
  document.head.appendChild(style);
  const msg = T[currentLang].goodNight;
  blackout.innerHTML = `<div class="gn-msg">${msg}</div>`;
  await wait(5000);
  window.close();
}

// ===== respiración =====
function breathProfile(mode){
  if(mode==="sleep"){ return {inhale:4000, hold:7000, exhale:8000}; }
  else if(mode==="calm"){ return {inhale:4000, hold:0, exhale:6000}; }
  return {inhale:4000, hold:0, exhale:4000};
}
function scaleCircle(scale, ms){
  circle.style.transitionProperty = 'transform';
  circle.style.transitionTimingFunction = 'ease-in-out';
  circle.style.transitionDuration = `${ms}ms`;
  void circle.offsetWidth;
  circle.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
async function breathingLoop(){
  const scaleInhale = 2.2, scaleHold=2.3, scaleExhale=1.0;
  while(breathingRunning){
    const prof = breathProfile(modeSel.value);
    const L = T[currentLang];

    // INHALAR
    instruction.textContent = L.inhale;
    beep(523,0.10);
    scaleCircle(scaleInhale, prof.inhale);
    await wait(prof.inhale+40);
    if(!breathingRunning) break;

    // MANTÉN / HOLD
    if(prof.hold>0){
      instruction.textContent = L.hold;
      beep(440,0.10);
      scaleCircle(scaleHold, Math.max(300, prof.hold));
      await wait(prof.hold+40);
      if(!breathingRunning) break;
    }

    // EXHALAR
    instruction.textContent = L.exhale;
    beep(392,0.10);
    scaleCircle(scaleExhale, prof.exhale);
    await wait(prof.exhale+40);
    if(!breathingRunning) break;
  }
}
function startBreathing(){
  if(breathingRunning) return;
  breathingRunning = true;
  ensureAudio();
  instruction.textContent = currentLang==="es" ? "Respirando..." : "Breathing...";

  if(modeSel.value==="sleep"){ showCountdown(); scheduleAutoStop(); }
  else{ hideBoth(); }
  breathingLoopPromise = breathingLoop();
}
function stopBreathing(){
  breathingRunning = false;
  instruction.textContent = T[currentLang].pressStart;
  scaleCircle(1.0,300);
  clearInterval(countdownIntervalId);
}

// ===== selector / countdown =====
function showSelector(){
  sessionControls.classList.remove("hidden");
  countdownBox.classList.add("hidden");
  sessionControls.style.display="";
  countdownBox.style.display="none";
}
function showCountdown(){
  sessionControls.classList.add("hidden");
  countdownBox.classList.remove("hidden");
  sessionControls.style.display="none";
  countdownBox.style.display="";
}
function hideBoth(){
  sessionControls.classList.add("hidden");
  countdownBox.classList.add("hidden");
  sessionControls.style.display="none";
  countdownBox.style.display="none";
}
function formatTime(ms){
  ms=Math.max(0,ms);
  const totalSec = Math.floor(ms/1000);
  const m = Math.floor(totalSec/60);
  const s = totalSec%60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function startCountdown(endEpochMs){
  clearInterval(countdownIntervalId);
  audioFadeStarted = false;
  const tick=()=>{
    const left = endEpochMs - Date.now();

    // Solo fade de audio 12s antes del final (sin blackout)
    if(left<=12000 && !audioFadeStarted){
      audioFadeStarted = true;
      fadeMasterGain(12);
    }

    countdownEl.textContent = formatTime(left);
    if(left<=0){
      clearInterval(countdownIntervalId);
      breathingRunning = false;
      showGoodNightThenExit();
    }
  };
  tick();
  countdownIntervalId = setInterval(tick, 250);
}
function scheduleAutoStop(){
  const mins = parseInt(sessionSel.value||"30",10);
  const end = Date.now() + mins*60*1000;
  startCountdown(end);
}

// ===== Interstitial (desde JS) =====
let lastInterstitialTs = 0;
function tryShowInterstitial(){
  const now = Date.now();
  if (now - lastInterstitialTs < 30000) return; // anti-spam 30s
  lastInterstitialTs = now;
  if (window.AndroidBridge && typeof AndroidBridge.showInterstitial === 'function') {
    AndroidBridge.showInterstitial();
  }
}

// ===== tabs =====
function switchSection(targetId){
  const wasBreathVisible = $('#breath-section')?.classList.contains('visible');
  const wasAnchorVisible = $('#anchor-section')?.classList.contains('visible');

  $$('.section').forEach(sec=>{
    sec.classList.toggle('visible',sec.id===targetId);
    sec.hidden = sec.id!==targetId;
  });
  $$('.tab').forEach(b=>b.classList.remove('active'));
  const btn=[...$$('.tab')].find(b=>b.dataset.target===targetId);
  if(btn) btn.classList.add('active');

  // Mostrar interstitial al cambiar entre respiración ↔ anclaje
  const isBreathTarget = targetId==="breath-section";
  const isAnchorTarget = targetId==="anchor-section";
  if ((wasBreathVisible && isAnchorTarget) || (wasAnchorVisible && isBreathTarget)){
    tryShowInterstitial();
  }

  if(targetId!=="breath-section") stopBreathing();
}
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>switchSection(btn.dataset.target));
});

// ===== Anclaje =====
let stepIndex=0;
let notes=["","","","",""];
function renderStep(){
  const l=T[currentLang];
  const total=l.steps.length;
  if(stepIndex>=total){
    anchorProgress.textContent = `${total} / ${total}`;
    if(progressFill) progressFill.style.width="100%";
    groundPrompt.textContent="";
    groundInputs.style.display="none";
    document.getElementById("groundHint").open=false;
    document.getElementById("groundActions").style.display="none";
    groundDone.hidden=false;
    feelMsgEl.hidden=true;
    return;
  }
  groundDone.hidden=true;
  document.getElementById("groundActions").style.display="";
  groundInputs.style.display="";
  if(progressFill){ progressFill.style.width=Math.round(stepIndex/total*100)+"%"; }
  anchorProgress.textContent=`${stepIndex+1} / ${total}`;
  groundPrompt.textContent=l.steps[stepIndex].label;
  groundHintTitle.textContent=l.needIdeas;
  groundHintsUl.innerHTML=l.steps[stepIndex].hints.map(h=>`<li>${h}</li>`).join("");
  groundInput.value=notes[stepIndex]||"";
  prevStepBtn.disabled = stepIndex===0;
}
function saveCurrent(){ notes[stepIndex]=groundInput.value.trim(); }
prevStepBtn.addEventListener("click",()=>{ if(stepIndex>0){ saveCurrent(); stepIndex--; renderStep(); }});
nextStepBtn.addEventListener("click",()=>{ saveCurrent(); stepIndex++; renderStep(); });
restartBtn.addEventListener("click",()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill) progressFill.style.width="0%"; renderStep(); });
restartFinalBtn.addEventListener("click",()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill) progressFill.style.width="0%"; renderStep(); });
feelGoodBtn.addEventListener("click",()=>{ feelMsgEl.hidden=false; feelMsgEl.textContent=currentLang==="es"?"Genial. Si querés, cerrá con una respiración tranquila. 💙":"Great. If you like, finish with a calm breath. 💙"; });
feelBadBtn.addEventListener("click",()=>{ feelMsgEl.hidden=false; feelMsgEl.textContent=currentLang==="es"?"Está bien no estar bien. Repite el anclaje o pasa a una respiración suave.":"It's okay not to be okay. Repeat the grounding or switch to gentle breathing."; });
goBreatheBtn.addEventListener("click",()=>{ switchSection("breath-section"); });

// ===== init =====
document.addEventListener("DOMContentLoaded",()=>{
  applyLang();
  if(modeSel.value==="sleep") showSelector(); else hideBoth();
  instruction.textContent=T[currentLang].pressStart;
  renderStep();
});
soundToggle?.addEventListener("change",()=>{ if(!soundToggle.checked && audioCtx){ fadeMasterGain(0.5); }});
sessionSel.addEventListener("change",()=>{ if(breathingRunning && modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }});
modeSel.addEventListener("change",()=>{ if(!breathingRunning){ if(modeSel.value==="sleep") showSelector(); else hideBoth(); } else { if(modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); } else { stopBreathing(); hideBoth(); } }});
startBtn.addEventListener("click",startBreathing);
stopBtn.addEventListener("click",()=>{ stopBreathing(); blackout.classList.remove("active"); blackout.innerHTML=""; });
