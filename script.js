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

// blackout
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
    pressStart:"Presiona iniciar", inhale:"Inhala", hold:"Sostén", exhale:"Exhala", left:"Quedan",
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
    good:"Me siento bien", bad:"Todavía me siento mal", breatheNow:"Respirar ahora"
  },
  en:{
    app:"SootheWaveApp",
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
    good:"I feel good", bad:"I still feel bad", breatheNow:"Breathe now"
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

  // anclaje
  anchorTitle.textContent = l.gTitle;
  $("#groundInputLabel").textContent = l.optWrite;
  groundHintTitle.textContent = l.needIdeas;
  $("#prevTxt").textContent = l.prev;
  $("#nextTxt").textContent = l.next;
  $("#restartTxt").textContent = l.restart;
  doneTitleEl.textContent = l.doneTitle;
  howFeelEl.textContent = l.howFeel;
  $("#feelGood").textContent = l.good;
  $("#feelBad").textContent  = l.bad;
  $("#goBreathe").textContent= l.breatheNow;

  // botón idioma (ES / EN)
  langBtn.textContent = currentLang.toUpperCase();
}

// toggle idioma
langBtn?.addEventListener("click", ()=>{
  currentLang = currentLang==="es" ? "en" : "es";
  applyLang();
  renderStep();
});

// ===== safe-area & viewport fix =====
function setVHVar(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVHVar);
window.addEventListener('orientationchange', setVHVar);
setVHVar();

// ===== Blackout (fade visual) =====
function triggerBlackout(seconds=8){
  blackout.classList.add("active");
  blackout.style.transitionDuration = `${seconds}s`;
}
function clearBlackout(){
  blackout.classList.remove("active");
}

// ===== respiración =====
function breathProfile(mode){
  if(mode==="sleep"){ // 4-7-8
    return {inhale:4000, hold:7000, exhale:8000};
  }else if(mode==="calm"){ // 4-6
    return {inhale:4000, hold:0, exhale:6000};
  }
  // relax 4-4
  return {inhale:4000, hold:0, exhale:4000};
}

/** 
 * Cambia el scale del círculo con transición SUAVE garantizada (sin “salto”).
 * 1) setea duración, 2) fuerza reflow, 3) aplica transform.
 */
function scaleCircle(scale, ms){
  circle.style.transitionProperty = 'transform';
  circle.style.transitionTimingFunction = 'ease-in-out';
  circle.style.transitionDuration = `${ms}ms`;
  // forzar reflow para que el navegador "registre" la nueva transición
  void circle.offsetWidth;
  circle.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

/** Loop asíncrono de respiración (evita solapes y brinco en 2ª inhalación) */
async function breathingLoop(){
  const scaleInhale = 2.2;
  const scaleHold  = 2.3;
  const scaleExhale= 1.0;

  while(breathingRunning){
    const prof = breathProfile(modeSel.value);
    const L = T[currentLang];

    // INHALAR
    instruction.textContent = L.inhale;
    beep(523,0.10);
    scaleCircle(scaleInhale, prof.inhale);
    await wait(prof.inhale + 40);
    if(!breathingRunning) break;

    // HOLD (si corresponde)
    if(prof.hold>0){
      instruction.textContent = L.hold;
      scaleCircle(scaleHold, Math.max(300, prof.hold)); // transición suave también en hold
      await wait(prof.hold + 40);
      if(!breathingRunning) break;
    }

    // EXHALAR
    instruction.textContent = L.exhale;
    beep(392,0.10);
    scaleCircle(scaleExhale, prof.exhale);
    await wait(prof.exhale + 40);
    if(!breathingRunning) break;

    // sigue el ciclo
  }
}

function startBreathing(){
  if(breathingRunning) return;
  breathingRunning = true;
  ensureAudio();
  instruction.textContent = currentLang==="es" ? "Respirando..." : "Breathing...";

  // preparar UI de "sleep"
  if(modeSel.value==="sleep"){
    showCountdown();
    scheduleAutoStop();
  }else{
    hideBoth();
  }

  // arranca loop asíncrono
  breathingLoopPromise = breathingLoop();
}

function stopBreathing(){
  breathingRunning = false;
  instruction.textContent = T[currentLang].pressStart;
  // volver al tamaño base suavemente
  scaleCircle(1.0, 300);
  clearInterval(countdownIntervalId);
  clearBlackout();
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

/* ===== countdown ===== */
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

    if(left <= 8000 && !audioFadeStarted){
      audioFadeStarted = true;
      fadeMasterGain(8);
      triggerBlackout(8);
    }

    countdownEl.textContent = formatTime(left);
    if(left<=0){
      clearInterval(countdownIntervalId);
      stopBreathing();
      setTimeout(clearBlackout, 1000);
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

// entrada volumen
volumeEl?.addEventListener("input", ()=>{
  if(gainNode) gainNode.gain.value = parseFloat(volumeEl.value||"0.6");
});

// tabs
function switchSection(targetId){
  $$('.section').forEach(sec=>{
    sec.classList.toggle('visible', sec.id===targetId);
    sec.hidden = sec.id!==targetId;
  });
  $$('.tab').forEach(b=>b.classList.remove('active'));
  const btn=[...$$('.tab')].find(b=>b.dataset.target===targetId);
  if(btn) btn.classList.add('active');
  if(targetId!=="breath-section") stopBreathing();
}
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>switchSection(btn.dataset.target));
});

/* ===== Anclaje: flujo por pasos ===== */
let stepIndex=0;
let notes=["","","","",""];
function renderStep(){
  const l=T[currentLang];
  const total = l.steps.length;

  if(stepIndex>=total){
    anchorProgress.textContent = `${total} / ${total}`;
    if (progressFill) { progressFill.style.width = "100%"; }
    groundPrompt.textContent = "";
    groundInputs.style.display = "none";
    document.getElementById("groundHint").open = false;
    document.getElementById("groundActions").style.display="none";
    groundDone.hidden=false;
    feelMsgEl.hidden=true;
    return;
  }

  groundDone.hidden=true;
  document.getElementById("groundActions").style.display="";
  groundInputs.style.display = "";

  if (progressFill) {
    const percent = Math.round(((stepIndex) / total) * 100);
    progressFill.style.width = percent + "%";
  }

  anchorProgress.textContent = `${stepIndex+1} / ${total}`;
  groundPrompt.textContent = l.steps[stepIndex].label;
  groundHintTitle.textContent = l.needIdeas;
  groundHintsUl.innerHTML = l.steps[stepIndex].hints.map(h=>`<li>${h}</li>`).join("");
  groundInput.value = notes[stepIndex] || "";

  prevStepBtn.disabled = stepIndex===0;
}
function saveCurrent(){ notes[stepIndex] = groundInput.value.trim(); }
prevStepBtn.addEventListener("click", ()=>{ if(stepIndex>0){ saveCurrent(); stepIndex--; renderStep(); }});
nextStepBtn.addEventListener("click", ()=>{ saveCurrent(); stepIndex++; renderStep(); });
restartBtn.addEventListener("click", ()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill){progressFill.style.width="0%";} renderStep(); });
restartFinalBtn.addEventListener("click", ()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill){progressFill.style.width="0%";} renderStep(); });

feelGoodBtn.addEventListener("click", ()=>{
  feelMsgEl.hidden=false;
  feelMsgEl.textContent = currentLang==="es"
    ? "Genial. Si querés, cerrá con una respiración tranquila. 💙"
    : "Great. If you like, finish with a calm breath. 💙";
});
feelBadBtn.addEventListener("click", ()=>{
  feelMsgEl.hidden=false;
  feelMsgEl.textContent = currentLang==="es"
    ? "Está bien no estar bien. Repite el anclaje o pasa a una respiración suave."
    : "It's okay not to be okay. Repeat the grounding or switch to gentle breathing.";
});
goBreatheBtn.addEventListener("click", ()=>{
  switchSection("breath-section");
});

/* ===== init ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  applyLang();
  if(modeSel.value==="sleep") showSelector(); else hideBoth();
  instruction.textContent = T[currentLang].pressStart;
  renderStep();
});

soundToggle?.addEventListener("change", ()=>{
  if(!soundToggle.checked && audioCtx){
    fadeMasterGain(0.5);
  }
});

sessionSel.addEventListener("change", ()=>{
  if(breathingRunning && modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }
});
modeSel.addEventListener("change", ()=>{
  if(!breathingRunning){
    if(modeSel.value==="sleep") showSelector(); else hideBoth();
  }else{
    if(modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }
    else{ stopBreathing(); hideBoth(); }
  }
});

startBtn.addEventListener("click", startBreathing);
stopBtn.addEventListener("click", ()=>{ stopBreathing(); clearBlackout(); });
