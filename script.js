// ===== helpers =====
const $ = (s)=>document.querySelector(s);

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
let phaseTimeoutId = null;
let breathingRunning = false;
let countdownIntervalId = null;
let audioFadeStarted = false; // para no disparar el fade de audio más de una vez

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

/* ==== Fade de audio maestro ==== */
function fadeMasterGain(seconds=8){
  if(!gainNode || !audioCtx) return;
  try{
    const now = audioCtx.currentTime;
    const g = gainNode.gain;
    const current = g.value;
    g.cancelScheduledValues(now);
    g.setValueAtTime(current, now);
    g.linearRampToValueAtTime(0.0001, now + seconds);
  }catch(e){}
}

/* ==== Blackout visual ==== */
function triggerBlackout(durationSec=8){
  // Ajustar duración del transition dinámicamente para sincronizar con el audio
  blackout.style.transitionDuration = `${durationSec}s`;
  blackout.classList.add("active");
}
function clearBlackout(){
  blackout.classList.remove("active");
}

/* ===== i18n ===== */
const T = {
  es:{
    app:"SootheWaveApp",
    pressStart:"Presiona iniciar", inhale:"Inhala", hold:"Mantén", exhale:"Exhala", left:"Quedan",
    sound:"Sonido", breath:"Respiración", anchor:"Anclaje",
    mode:"Modo:", relax:"Relajación (4-4)", calm:"Calma (4-6)", sleep:"Dormir (4-7-8)", duration:"Duración:",
    gTitle:"Ejercicio de Anclaje",
    steps:[
      {label:"5 cosas que veas", hints:["Colores, formas, objetos, luces, sombras."]},
      {label:"4 cosas que sientas al tacto", hints:["Ropa, silla, temperatura, textura de un objeto."]},
      {label:"3 cosas que oigas", hints:["Ambiente, tu respiración, ventilador, tráfico."]},
      {label:"2 olores (o recuerda algunos)", hints:["Café, jabón, madera, perfume."]},
      {label:"1 sabor que sientas/recuerdes", hints:["Agua, menta, dulce, amargo."]},
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
      {label:"3 things you can hear", hints:["Ambient sounds, your breath, fan, traffic."]},
      {label:"2 smells (or recall some)", hints:["Coffee, soap, wood, perfume."]},
      {label:"1 taste you feel/recall", hints:["Water, mint, sweet, bitter."]},
    ],
    optWrite:"(Optional) Write here:",
    needIdeas:"Need ideas?",
    prev:"Back", next:"Next", restart:"Restart",
    doneTitle:"You’ve completed the exercise!", howFeel:"How do you feel now?",
    good:"I feel good", bad:"I still feel bad", breatheNow:"Breathe now"
  }
};
function detectInitialLanguage(){
  const saved = localStorage.getItem("breath_lang");
  if(saved && T[saved]) return saved;
  const nav=(navigator.language||"es").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}
let currentLang = detectInitialLanguage();

function applyI18n(){
  const l=T[currentLang];
  document.documentElement.lang=currentLang;
  document.title = l.app;

  $("#title").textContent = l.app;
  $("#soundLabel").textContent = l.sound;
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
  $("#doneTitle").textContent = l.doneTitle;
  $("#howFeel").textContent = l.howFeel;
  $("#feelGood").textContent = l.good;
  $("#feelBad").textContent = l.bad;
  $("#goBreathe").textContent = l.breatheNow;

  renderStep();
}

/* toggle idioma */
langBtn.addEventListener("click", ()=>{
  currentLang = currentLang==="es" ? "en" : "es";
  langBtn.textContent = currentLang==="es" ? "EN" : "ES";
  localStorage.setItem("breath_lang", currentLang);
  applyI18n();
});

/* ===== selector/contador ===== */
function showCountdown(){
  countdownBox.classList.remove("hidden");
  sessionControls.classList.add("hidden");
  countdownBox.style.display="inline-flex";
  sessionControls.style.display="none";
}
function showSelector(){
  sessionControls.classList.remove("hidden");
  countdownBox.classList.add("hidden");
  sessionControls.style.display="inline-flex";
  countdownBox.style.display="none";
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
  audioFadeStarted = false; // reset por si venimos de otra sesión

  const tick=()=>{
    const left = endEpochMs - Date.now();
    // Iniciar fade de sonido + blackout cuando falten 8s (8000ms)
    if(left <= 8000 && !audioFadeStarted){
      audioFadeStarted = true;
      fadeMasterGain(8);     // <-- fade de audio 8s
      triggerBlackout(8);    // <-- blackout visual en 8s
    }

    countdownEl.textContent = formatTime(left);
    if(left <= 0){
      clearInterval(countdownIntervalId);
      finishSleepSession();  // terminar sesión
    }
  };
  tick();
  countdownIntervalId = setInterval(tick, 500);
}
function scheduleAutoStop(){
  const mins = parseInt(sessionSel.value||"30",10);
  const end  = Date.now() + mins*60*1000;
  startCountdown(end);
}

/* ===== breathing ===== */
function startBreathing(){
  stopBreathing(); // limpia previos
  clearBlackout();
  audioFadeStarted = false;
  breathingRunning = true;
  ensureAudio();

  const mode=modeSel.value;
  let inhale=4000, hold=0, exhale=4000;
  if(mode==="calm")  { inhale=4000; hold=0;    exhale=6000; }
  if(mode==="sleep") { inhale=4000; hold=7000; exhale=8000; }

  if(mode==="sleep"){ scheduleAutoStop(); showCountdown(); }
  else { hideBoth(); }

  const l=T[currentLang];
  function cycle(){
    instruction.textContent=l.inhale; beep(392,0.2);
    circle.style.setProperty("--phase-duration", `${inhale}ms`);
    circle.style.transform="translate(-50%, -50%) scale(1.15)";
    phaseTimeoutId=setTimeout(()=>{
      if(hold>0){ instruction.textContent=l.hold; beep(660,0.12); }
      phaseTimeoutId=setTimeout(()=>{
        instruction.textContent=l.exhale; beep(329.6,0.2);
        circle.style.setProperty("--phase-duration", `${exhale}ms`);
        circle.style.transform="translate(-50%, -50%) scale(1)";
        phaseTimeoutId=setTimeout(cycle, exhale);
      }, hold);
    }, inhale);
  }
  cycle();
}
function stopBreathing({ preserveBlackout=false } = {}){
  if(phaseTimeoutId){ clearTimeout(phaseTimeoutId); phaseTimeoutId=null; }
  if(countdownIntervalId){ clearInterval(countdownIntervalId); countdownIntervalId=null; }
  breathingRunning=false;
  instruction.textContent=T[currentLang].pressStart;
  circle.style.transform="translate(-50%, -50%) scale(1)";
  if(modeSel.value==="sleep") showSelector(); else hideBoth();
  if(!preserveBlackout) clearBlackout();
}
function finishSleepSession(){
  // Asegurar blackout (por si entró por 8s exactos y no se disparó el if previo)
  if(!audioFadeStarted){
    audioFadeStarted = true;
    fadeMasterGain(8);
    triggerBlackout(8);
  }
  // detener pero conservar blackout
  stopBreathing({ preserveBlackout:true });
}

/* ===== tabs ===== */
function switchSection(targetId){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('visible'));
  document.getElementById(targetId).classList.add('visible');
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  const btn=[...document.querySelectorAll('.tab')].find(b=>b.dataset.target===targetId);
  if(btn) btn.classList.add('active');
  if(targetId!=="breath-section") stopBreathing();
}
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>switchSection(btn.dataset.target));
});

/* ===== Anclaje: flujo por pasos ===== */
let stepIndex=0;
let notes=["","","","",""];
function renderStep(){
  const l=T[currentLang];
  const total = l.steps.length;

  if(stepIndex>=total){
    // pantalla final
    anchorProgress.textContent = `${total} / ${total}`;
    groundPrompt.textContent = "";
    groundInputs.style.display = "none";
    document.getElementById("groundHint").open = false;
    document.getElementById("groundActions").style.display="none";
    groundDone.hidden=false;
    feelMsgEl.hidden=true;
    return;
  }

  // paso activo
  groundDone.hidden=true;
  document.getElementById("groundActions").style.display="";
  groundInputs.style.display = "";

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
restartBtn.addEventListener("click", ()=>{ stepIndex=0; notes=["","","","",""]; renderStep(); });
restartFinalBtn.addEventListener("click", ()=>{ stepIndex=0; notes=["","","","",""]; renderStep(); });

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

/* ===== init / eventos varios ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  langBtn.textContent = currentLang==="es" ? "EN" : "ES";
  applyI18n();
  if(modeSel.value==="sleep") showSelector(); else hideBoth();
});
volumeEl.addEventListener("input", ()=>{ if(gainNode) gainNode.gain.value=parseFloat(volumeEl.value||"0.6"); });
soundToggle.addEventListener("change", ()=>{ if(soundToggle.checked) ensureAudio(); });

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
stopBtn.addEventListener("click", ()=>{ stopBreathing(); /* si se detiene manual, también limpiamos blackout */ clearBlackout(); });
