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
const tabSounds    = $("#tab-sounds");

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

// sonidos (UI)
const soundsTitle = $("#soundsTitle");
const lblRain    = $("#lbl-rain");
const lblNature  = $("#lbl-nature");
const lblSea     = $("#lbl-sea");
const soundNote  = $("#soundNote");

// ===== estado =====
let breathingRunning = false;
let breathingLoopPromise = null;
let countdownIntervalId = null;
let audioFadeStarted = false;

/* ======================================================================
   SHIM WEB PARA ANDROIDBRIDGE (reproducción HTML5 con ./sounds/*.ogg)
   - No se activa en Android real (si window.AndroidBridge ya existe)
   - Reproduce 1 sonido a la vez: rain / nature / sea
   - Respeta el volumen del slider #volume
   ====================================================================== */
(function () {
  if (window.AndroidBridge) return; // En Android nativo, no tocar

  const audios = {
    rain:   new Audio('sounds/rain.ogg'),
    nature: new Audio('sounds/nature.ogg'),
    sea:    new Audio('sounds/sea.ogg'),
  };

  Object.values(audios).forEach(a => {
    a.loop = true;
    a.preload = 'auto';
    // volumen inicial según el slider existente
    const initV = Math.max(0, Math.min(1, parseFloat((volumeEl && volumeEl.value) || "0.6")));
    a.volume = initV;
  });

  function stopAll() {
    Object.values(audios).forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
  }

  function setGlobalVolume(v) {
    const vol = Math.max(0, Math.min(1, parseFloat(v || 0)));
    Object.values(audios).forEach(a => { a.volume = vol; });
  }

  // Exponer mismo contrato que usa la app
  window.AndroidBridge = {
    playRain()   { stopAll(); audios.rain.play().catch(()=>{}); },
    playNature() { stopAll(); audios.nature.play().catch(()=>{}); },
    playSea()    { stopAll(); audios.sea.play().catch(()=>{}); },
    stopAll,
    setGlobalVolume,
    setSoundBoost(_) { /* no-op en web */ },
    showInterstitialThenWithTag(_) { /* no-op en web */ },
    showInterstitial() { /* no-op en web */ },
    showInterstitialThenStartSleep() { /* no-op en web */ },
    onSessionEnded() { /* no-op en web */ },
  };

  // Mantener volumen sincronizado cuando muevas el slider
  if (volumeEl) {
    const syncVol = () => setGlobalVolume(volumeEl.value);
    volumeEl.addEventListener('input',  syncVol);
    volumeEl.addEventListener('change', syncVol);
  }
})();

// ===== Audio cues (beeps de respiración) =====
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
    sound:"Sonido", breath:"Respiración", anchor:"Anclaje", sounds:"Sonidos",
    mode:"Modo:", relax:"Relajación (4-4)", calm:"Calma (4-6)", sleep:"Dormir (4-7-8)", duration:"Duración:",
    gTitle:"Ejercicio de Anclaje",
    steps:[
      {label:"5 cosas que veas", hints:["Colores, objetos, luz/sombra, formas."]},
      {label:"4 cosas que sientas", hints:["Ropa sobre la piel, soporte de la silla, temperatura, textura."]},
      {label:"3 cosas que escuches", hints:["Sonidos lejanos, tráfico, viento, una voz, electrodomésticos."]},
      {label:"2 cosas que huelas",  hints:["Café, jabón, perfume, aire fresco."]},
      {label:"1 cosa que saborees", hints:["Agua, menta, sabor en la boca ahora."]}],
    optWrite:"Escribe aquí si quieres (opcional):",
    needIdeas:"¿Necesitas ideas?",
    prev:"Anterior", next:"Siguiente", restart:"Reiniciar",
    doneTitle:"¡Completaste el ejercicio!", howFeel:"¿Cómo te sientes ahora?",
    good:"Me siento bien", bad:"Todavía me siento mal", breatheNow:"Respirar ahora",
    goodNight:"Buenas noches",
    speakAloud:"Puedes decirlas en voz alta o escribirlas.",
    placeholder:"Ej.: taza azul, luz tenue, sonido de la calle.",
    soundsTitle:"Sonidos", rain:"Lluvia", nature:"Naturaleza", sea:"Mar",
    oneOnly:"Solo se reproduce un sonido a la vez."
  },
  en:{
    app:"SootheWaveApp",
    startLabel:"Start",
    stopLabel:"Stop",
    pressStart:"Press start", inhale:"Inhale", hold:"Hold", exhale:"Exhale", left:"Left",
    sound:"Sound", breath:"Breathing", anchor:"Grounding", sounds:"Sounds",
    mode:"Mode:", relax:"Relaxation (4-4)", calm:"Calm (4-6)", sleep:"Sleep (4-7-8)", duration:"Duration:",
    gTitle:"Grounding Exercise",
    steps:[
      {label:"5 things you can see", hints:["Colors, shapes, objects, light, shadows."]},
      {label:"4 things you can feel", hints:["Clothes, chair, temperature, texture of an object."]},
      {label:"3 things you can hear", hints:["Distant sounds, traffic, wind, voices, appliances."]},
      {label:"2 things you can smell", hints:["Coffee, soap, perfume, fresh air."]},
      {label:"1 thing you can taste", hints:["Water, mint, current taste."]}],
    optWrite:"Write here if you want (optional):",
    needIdeas:"Need ideas?",
    prev:"Previous", next:"Next", restart:"Restart",
    doneTitle:"You completed the exercise!", howFeel:"How do you feel now?",
    good:"I feel good", bad:"I still feel bad", breatheNow:"Breathe now",
    goodNight:"Good night",
    speakAloud:"You can say them out loud or write them.",
    placeholder:"E.g.: blue cup, dim light, street noise.",
    soundsTitle:"Sounds", rain:"Rain", nature:"Nature", sea:"Sea",
    oneOnly:"Only one sound plays at a time."
  }
};
function applyLang(){
  const l=T[currentLang];
  document.title = l.app;
  $("#title").textContent = l.app;
  $("#soundLabel").textContent = l.sound;
  $("#tab-breath").textContent = l.breath;
  $("#tab-anchor").textContent = l.anchor;
  $("#tab-sounds").textContent = l.sounds;

  $("#modeLabel").textContent = l.mode;
  $("#sessionLabel").textContent = l.duration;
  countdownLbl.textContent = l.left;
  if(modeSel.options[0]) modeSel.options[0].text = l.relax;
  if(modeSel.options[1]) modeSel.options[1].text = l.calm;
  if(modeSel.options[2]) modeSel.options[2].text = l.sleep;
  instruction.textContent = l.pressStart;

  if (startBtn) startBtn.textContent = l.startLabel;
  if (stopBtn)  stopBtn.textContent  = l.stopLabel;

  // Grounding
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

  // Sonidos
  if (soundsTitle) soundsTitle.textContent = l.soundsTitle;
  if (lblRain)    lblRain.textContent     = l.rain;
  if (lblNature)  lblNature.textContent   = l.nature;
  if (lblSea)     lblSea.textContent      = l.sea;
  if (soundNote)  soundNote.textContent   = l.oneOnly;

  langBtn.textContent = currentLang.toUpperCase();
  if (typeof renderStep === "function") renderStep();
}
langBtn?.addEventListener("click", ()=>{
  currentLang = currentLang==="es" ? "en" : "es";
  applyLang();
});

// ===== viewport fix =====
function setVHVar(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVHVar);
window.addEventListener('orientationchange', setVHVar);
setVHVar();

// ===== Buenas noches (al final del timer) =====
async function showGoodNightThenExit(){
  if (window.AndroidBridge && typeof AndroidBridge.onSessionEnded === 'function') {
    AndroidBridge.onSessionEnded();
    return;
  }
  blackout.style.transitionDuration = '0.8s';
  blackout.classList.add('active');
  const style = document.createElement('style');
  style.textContent = `
    #blackout.active .gn-msg{
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      text-align:center; padding:24px; font-weight:700; font-size:28px; color:#fff; background:#000;
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

    instruction.textContent = L.inhale;
    beep(523,0.10);
    scaleCircle(scaleInhale, prof.inhale);
    await wait(prof.inhale+40);
    if(!breathingRunning) break;

    if(prof.hold>0){
      instruction.textContent = L.hold;
      beep(440,0.10);
      scaleCircle(scaleHold, Math.max(300, prof.hold));
      await wait(prof.hold+40);
      if(!breathingRunning) break;
    }

    instruction.textContent = L.exhale;
    beep(392,0.10);
    scaleCircle(1.0, prof.exhale);
    await wait(prof.exhale+40);
    if(!breathingRunning) break;
  }
}
function startBreathing(){
  if(breathingRunning) return;
  breathingRunning = true;
  ensureAudio();
  instruction.textContent = currentLang==="es" ? "Respirando..." : "Breathing...";
  hideBoth();
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
  showCountdown();
  startCountdown(end);
}

// ===== tabs (robustos con fallback) =====
let adAwaitingTab = false;
window.__pendingTabTarget = null;

// Callback que Android llama tras cerrar el interstitial de tabs
window.__afterInterstitial = function(tag){
  if (!window.__pendingTabTarget) return;
  const targetId = window.__pendingTabTarget;
  window.__pendingTabTarget = null;
  adAwaitingTab = false;
  switchSectionCore(targetId);
};

function switchSectionCore(targetId){
  $$('.section').forEach(sec=>{
    sec.classList.toggle('visible',sec.id===targetId);
    sec.hidden = sec.id!==targetId;
  });
  $$('.tab').forEach(b=>b.classList.remove('active'));
  const btn=[...$$('.tab')].find(b=>b.dataset.target===targetId);
  if(btn) btn.classList.add('active');

  if(targetId!=="breath-section") stopBreathing(); // NO paramos los sonidos
}

// === FIX: cambio instantáneo en web, interstitial solo en Android real ===
function switchSection(targetId) {
  const current = document.querySelector('.tab.active')?.dataset.target;
  if (current === targetId) return;

  // Web (sin métodos de interstitial en AndroidBridge): cambiar directo
  if (!window.AndroidBridge || typeof AndroidBridge.showInterstitialThenWithTag !== "function") {
    switchSectionCore(targetId);
    return;
  }

  // Android con interstitial
  if (adAwaitingTab) return; 
  adAwaitingTab = true;
  window.__pendingTabTarget = targetId;

  let switched = false;
  const proceed = () => {
    if (switched) return;
    switched = true;
    adAwaitingTab = false;
    const id = window.__pendingTabTarget || targetId;
    window.__pendingTabTarget = null;
    switchSectionCore(id);
  };

  try {
    if (typeof AndroidBridge.showInterstitialThenWithTag === "function") {
      AndroidBridge.showInterstitialThenWithTag("tab_change");
      setTimeout(proceed, 2000); // fallback
    } else if (typeof AndroidBridge.showInterstitial === "function") {
      AndroidBridge.showInterstitial();
      setTimeout(proceed, 300);
    } else {
      proceed();
    }
  } catch (e) {
    proceed();
  }
}

// listeners de tabs
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

// ===== SONIDOS (AndroidBridge, exclusivos, con feedback visual) =====
let currentSound = null; // 'rain' | 'nature' | 'sea' | null

function callBridge(method){
  if (window.AndroidBridge && typeof AndroidBridge[method] === "function"){
    try{ AndroidBridge[method](); }catch(e){ console.warn(e); }
  }else{
    console.warn("AndroidBridge no disponible:", method);
  }
}

const SOUND_METHODS = {
  rain:   { play: "playRain"   },
  nature: { play: "playNature" },
  sea:    { play: "playSea"    }
};

const playBtns = {
  rain:   $("#play-rain"),
  nature: $("#play-nature"),
  sea:    $("#play-sea")
};
const stopBtns = {
  rain:   $("#stop-rain"),
  nature: $("#stop-nature"),
  sea:    $("#stop-sea")
};

function setPlayingUI(key){
  Object.values(playBtns).forEach(b=>b && b.classList.remove("is-playing"));
  if (key && playBtns[key]) playBtns[key].classList.add("is-playing");
}

function playSound(key){
  if (!SOUND_METHODS[key]) return;
  callBridge("stopAll");
  callBridge(SOUND_METHODS[key].play);
  currentSound = key;
  setPlayingUI(key);
}

function stopSound(key){
  callBridge("stopAll");
  currentSound = null;
  setPlayingUI(null);
}

Object.keys(playBtns).forEach(key=>{
  const btn = playBtns[key];
  if (!btn) return;
  btn.addEventListener("click", ()=>{
    if (currentSound === key){
      stopSound(key);
    } else {
      playSound(key);
    }
  });
});
Object.keys(stopBtns).forEach(key=>{
  const btn = stopBtns[key];
  if (!btn) return;
  btn.addEventListener("click", ()=> stopSound(key));
});

// ===== init =====
document.addEventListener("DOMContentLoaded",()=>{
  applyLang();
  if(modeSel.value==="sleep"){ showSelector(); } else { hideBoth(); }
  instruction.textContent=T[currentLang].pressStart;
  renderStep();

  // Boost por defecto (+8 dB) en los MediaPlayer nativos
  if (window.AndroidBridge && typeof AndroidBridge.setSoundBoost === "function") {
    try { AndroidBridge.setSoundBoost(8); } catch (e) {}
  }

  // Sincronizar el volumen inicial del slider con Android/web
  const initV = Math.max(0, Math.min(1, parseFloat(volumeEl.value || "0.6")));
  if (window.AndroidBridge && typeof AndroidBridge.setGlobalVolume === "function") {
    try { AndroidBridge.setGlobalVolume(initV); } catch(e){}
  }
});

// ===== eventos finales =====
soundToggle?.addEventListener("change",()=>{ if(!soundToggle.checked && audioCtx){ fadeMasterGain(0.5); }});

// Volumen: WebAudio + Android (input y change)
function onVolChange(){
  const v = Math.max(0, Math.min(1, parseFloat(volumeEl.value || "0.6")));
  if (gainNode) { gainNode.gain.value = v; }
  if (window.AndroidBridge && typeof AndroidBridge.setGlobalVolume === "function") {
    try { AndroidBridge.setGlobalVolume(v); } catch(e){}
  }
}
volumeEl.addEventListener("input", onVolChange);
volumeEl.addEventListener("change", onVolChange);

sessionSel.addEventListener("change",()=>{ if(breathingRunning && modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }});

// START “Dormir”: interstitial y luego iniciar timer
startBtn.addEventListener("click", ()=>{
  if (modeSel.value==="sleep" && !breathingRunning){
    window.__startSleepAfterAd = function(){
      startBreathing();
      scheduleAutoStop();
      showCountdown();
      window.__startSleepAfterAd = null;
    };
    if (window.AndroidBridge && typeof AndroidBridge.showInterstitialThenStartSleep === "function") {
      AndroidBridge.showInterstitialThenStartSleep();
    } else {
      window.__startSleepAfterAd();
    }
  } else {
    startBreathing();
  }
});

modeSel.addEventListener("change",()=>{
  if(!breathingRunning){
    if(modeSel.value==="sleep") showSelector(); else hideBoth();
  } else {
    if(modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }
    else { stopBreathing(); hideBoth(); }
  }
});

stopBtn.addEventListener("click",()=>{
  stopBreathing();
  blackout.classList.remove("active");
  blackout.innerHTML="";
});
