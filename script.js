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

// anclaje / grounding
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
  if(!soundToggle?.checked) return;
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
const SUPPORTED_LANGS = ["es","en","pt","fr","it","de"];
function detectPreferredLang(){
  const fromStorage = localStorage.getItem("sw_lang");
  if (fromStorage && SUPPORTED_LANGS.includes(fromStorage)) return fromStorage;
  const nav = (navigator.language||"en").toLowerCase();
  // map locales to our keys
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("it")) return "it";
  if (nav.startsWith("de")) return "de";
  return "en";
}
let currentLang = detectPreferredLang();

const T={
  es:{ app:"SootheWaveApp", startLabel:"Iniciar", stopLabel:"Detener",
    pressStart:"Presiona iniciar", inhale:"Inhala", hold:"Mantén", exhale:"Exhala", left:"Quedan",
    sound:"Sonido", breath:"Respiración", anchor:"Anclaje", sounds:"Sonidos",
    mode:"Modo:", relax:"Relajación (4-4)", calm:"Calma (4-6)", sleep:"Dormir (4-7-8)", duration:"Duración:",
    gTitle:"Ejercicio de Anclaje",
    steps:[ {label:"5 cosas que veas", hints:["Colores, objetos, luz/sombra, formas."]},
      {label:"4 cosas que sientas", hints:["Ropa sobre la piel, soporte de la silla, temperatura, textura."]},
      {label:"3 cosas que escuches", hints:["Sonidos lejanos, tráfico, viento, una voz, electrodomésticos."]},
      {label:"2 cosas que huelas",  hints:["Café, jabón, perfume, aire fresco."]},
      {label:"1 cosa que saborees", hints:["Agua, menta, sabor en la boca ahora."]}],
    optWrite:"Escribe aquí si quieres (opcional):", needIdeas:"¿Necesitas ideas?",
    prev:"Anterior", next:"Siguiente", restart:"Reiniciar",
    doneTitle:"¡Completaste el ejercicio!", howFeel:"¿Cómo te sientes ahora?",
    good:"Me siento bien", bad:"Todavía me siento mal", breatheNow:"Respirar ahora",
    goodNight:"Buenas noches", speakAloud:"Puedes decirlas en voz alta o escribirlas.",
    placeholder:"Ej.: taza azul, luz tenue, sonido de la calle.",
    soundsTitle:"Sonidos", rain:"Lluvia", nature:"Naturaleza", sea:"Mar",
    oneOnly:"Solo se reproduce un sonido a la vez."
  },
  en:{ app:"SootheWaveApp", startLabel:"Start", stopLabel:"Stop",
    pressStart:"Press start", inhale:"Inhale", hold:"Hold", exhale:"Exhale", left:"Left",
    sound:"Sound", breath:"Breathing", anchor:"Grounding", sounds:"Sounds",
    mode:"Mode:", relax:"Relaxation (4-4)", calm:"Calm (4-6)", sleep:"Sleep (4-7-8)", duration:"Duration:",
    gTitle:"Grounding Exercise",
    steps:[ {label:"5 things you can see", hints:["Colors, shapes, objects, light, shadows."]},
      {label:"4 things you can feel", hints:["Clothes, chair, temperature, texture of an object."]},
      {label:"3 things you can hear", hints:["Distant sounds, traffic, wind, voices, appliances."]},
      {label:"2 things you can smell", hints:["Coffee, soap, perfume, fresh air."]},
      {label:"1 thing you can taste", hints:["Water, mint, current taste."]}],
    optWrite:"Write here if you want (optional):", needIdeas:"Need ideas?",
    prev:"Previous", next:"Next", restart:"Restart",
    doneTitle:"You completed the exercise!", howFeel:"How do you feel now?",
    good:"I feel good", bad:"I still feel bad", breatheNow:"Breathe now",
    goodNight:"Good night", speakAloud:"You can say them out loud or write them.",
    placeholder:"E.g.: blue cup, dim light, street noise.",
    soundsTitle:"Sounds", rain:"Rain", nature:"Nature", sea:"Sea",
    oneOnly:"Only one sound plays at a time."
  },
  pt:{ app:"SootheWaveApp", startLabel:"Iniciar", stopLabel:"Parar",
    pressStart:"Pressione iniciar", inhale:"Inspire", hold:"Segure", exhale:"Expire", left:"Restam",
    sound:"Som", breath:"Respiração", anchor:"Ancoragem", sounds:"Sons",
    mode:"Modo:", relax:"Relaxamento (4-4)", calm:"Calma (4-6)", sleep:"Dormir (4-7-8)", duration:"Duração:",
    gTitle:"Exercício de Ancoragem",
    steps:[ {label:"5 coisas que você pode ver", hints:["Cores, objetos, luz/sombra, formas."]},
      {label:"4 coisas que você pode sentir", hints:["Roupas na pele, apoio da cadeira, temperatura, textura."]},
      {label:"3 coisas que você pode ouvir", hints:["Sons distantes, trânsito, vento, uma voz, eletrodomésticos."]},
      {label:"2 coisas que você pode cheirar", hints:["Café, sabonete, perfume, ar fresco."]},
      {label:"1 coisa que você pode saborear", hints:["Água, menta, sabor na boca agora."]}],
    optWrite:"Escreva aqui se quiser (opcional):", needIdeas:"Precisa de ideias?",
    prev:"Anterior", next:"Próximo", restart:"Reiniciar",
    doneTitle:"Você completou o exercício!", howFeel:"Como você se sente agora?",
    good:"Me sinto bem", bad:"Ainda me sinto mal", breatheNow:"Respirar agora",
    goodNight:"Boa noite", speakAloud:"Você pode dizer em voz alta ou escrever.",
    placeholder:"Ex.: xícara azul, luz suave, barulho da rua.",
    soundsTitle:"Sons", rain:"Chuva", nature:"Natureza", sea:"Mar",
    oneOnly:"Apenas um som toca por vez."
  },
  fr:{ app:"SootheWaveApp", startLabel:"Démarrer", stopLabel:"Arrêter",
    pressStart:"Appuyez sur démarrer", inhale:"Inspirez", hold:"Retenez", exhale:"Expirez", left:"Restant",
    sound:"Son", breath:"Respiration", anchor:"Ancrage", sounds:"Sons",
    mode:"Mode :", relax:"Relaxation (4-4)", calm:"Calme (4-6)", sleep:"Dormir (4-7-8)", duration:"Durée :",
    gTitle:"Exercice d’ancrage",
    steps:[ {label:"5 choses que vous pouvez voir", hints:["Couleurs, objets, lumière/ombre, formes."]},
      {label:"4 choses que vous pouvez sentir", hints:["Vêtements, chaise, température, texture."]},
      {label:"3 choses que vous pouvez entendre", hints:["Sons lointains, circulation, vent, voix, appareils."]},
      {label:"2 choses que vous pouvez sentir (odorat)", hints:["Café, savon, parfum, air frais."]},
      {label:"1 chose que vous pouvez goûter", hints:["Eau, menthe, goût actuel."]}],
    optWrite:"Écrivez ici si vous voulez (optionnel) :", needIdeas:"Besoin d’idées ?",
    prev:"Précédent", next:"Suivant", restart:"Recommencer",
    doneTitle:"Vous avez terminé l’exercice !", howFeel:"Comment vous sentez-vous maintenant ?",
    good:"Je me sens bien", bad:"Je me sens encore mal", breatheNow:"Respirer maintenant",
    goodNight:"Bonne nuit", speakAloud:"Vous pouvez les dire à voix haute ou les écrire.",
    placeholder:"Ex. : tasse bleue, lumière tamisée, bruit de la rue.",
    soundsTitle:"Sons", rain:"Pluie", nature:"Nature", sea:"Mer",
    oneOnly:"Un seul son peut être joué à la fois."
  },
  it:{ app:"SootheWaveApp", startLabel:"Avvia", stopLabel:"Ferma",
    pressStart:"Premi avvia", inhale:"Inspira", hold:"Trattieni", exhale:"Espira", left:"Rimasti",
    sound:"Suono", breath:"Respirazione", anchor:"Radicamento", sounds:"Suoni",
    mode:"Modalità:", relax:"Rilassamento (4-4)", calm:"Calma (4-6)", sleep:"Dormire (4-7-8)", duration:"Durata:",
    gTitle:"Esercizio di radicamento",
    steps:[ {label:"5 cose che puoi vedere", hints:["Colori, oggetti, luce/ombra, forme."]},
      {label:"4 cose che puoi sentire (tatto)", hints:["Vestiti sulla pelle, sedia, temperatura, consistenza."]},
      {label:"3 cose che puoi sentire (udito)", hints:["Suoni lontani, traffico, vento, voce, elettrodomestici."]},
      {label:"2 cose che puoi annusare", hints:["Caffè, sapone, profumo, aria fresca."]},
      {label:"1 cosa che puoi assaporare", hints:["Acqua, menta, sapore attuale."]}],
    optWrite:"Scrivi qui se vuoi (opzionale):", needIdeas:"Hai bisogno di idee?",
    prev:"Precedente", next:"Successivo", restart:"Ricomincia",
    doneTitle:"Hai completato l’esercizio!", howFeel:"Come ti senti adesso?",
    good:"Mi sento bene", bad:"Mi sento ancora male", breatheNow:"Respira ora",
    goodNight:"Buona notte", speakAloud:"Puoi dirle ad alta voce o scriverle.",
    placeholder:"Es.: tazza blu, luce soffusa, rumore della strada.",
    soundsTitle:"Suoni", rain:"Pioggia", nature:"Natura", sea:"Mare",
    oneOnly:"Può essere riprodotto un solo suono alla volta."
  },
  de:{ app:"SootheWaveApp", startLabel:"Starten", stopLabel:"Stopp",
    pressStart:"Drücken Sie Start", inhale:"Einatmen", hold:"Anhalten", exhale:"Ausatmen", left:"Verbleibend",
    sound:"Ton", breath:"Atmung", anchor:"Erdung", sounds:"Klänge",
    mode:"Modus:", relax:"Entspannung (4-4)", calm:"Ruhe (4-6)", sleep:"Schlafen (4-7-8)", duration:"Dauer:",
    gTitle:"Erdungsübung",
    steps:[ {label:"5 Dinge, die Sie sehen können", hints:["Farben, Objekte, Licht/Schatten, Formen."]},
      {label:"4 Dinge, die Sie fühlen können", hints:["Kleidung auf der Haut, Stuhl, Temperatur, Textur."]},
      {label:"3 Dinge, die Sie hören können", hints:["Entfernte Geräusche, Verkehr, Wind, Stimmen, Geräte."]},
      {label:"2 Dinge, die Sie riechen können", hints:["Kaffee, Seife, Parfüm, frische Luft."]},
      {label:"1 Sache, die Sie schmecken können", hints:["Wasser, Minze, aktueller Geschmack."]}],
    optWrite:"Schreiben Sie hier, wenn Sie möchten (optional):", needIdeas:"Brauchen Sie Ideen?",
    prev:"Zurück", next:"Weiter", restart:"Neu starten",
    doneTitle:"Sie haben die Übung abgeschlossen!", howFeel:"Wie fühlen Sie sich jetzt?",
    good:"Ich fühle mich gut", bad:"Ich fühle mich noch schlecht", breatheNow:"Jetzt atmen",
    goodNight:"Gute Nacht", speakAloud:"Sie können sie laut sagen oder aufschreiben.",
    placeholder:"Z. B.: blaue Tasse, gedämpftes Licht, Straßenlärm.",
    soundsTitle:"Klänge", rain:"Regen", nature:"Natur", sea:"Meer",
    oneOnly:"Es kann nur ein Klang gleichzeitig abgespielt werden."
  }
};

function applyLang(){
  const l=T[currentLang];
  document.title = l.app;
  $("#title")?.textContent = l.app;
  $("#soundLabel")?.textContent = l.sound;
  $("#tab-breath")?.textContent = l.breath;
  $("#tab-anchor")?.textContent = l.anchor;
  $("#tab-sounds")?.textContent = l.sounds;

  $("#modeLabel")?.textContent = l.mode;
  $("#sessionLabel")?.textContent = l.duration;
  if (countdownLbl) countdownLbl.textContent = l.left;
  if(modeSel?.options?.[0]) modeSel.options[0].text = l.relax;
  if(modeSel?.options?.[1]) modeSel.options[1].text = l.calm;
  if(modeSel?.options?.[2]) modeSel.options[2].text = l.sleep;
  if (instruction) instruction.textContent = l.pressStart;

  if (startBtn) startBtn.textContent = l.startLabel;
  if (stopBtn)  stopBtn.textContent  = l.stopLabel;

  // Grounding
  if (anchorTitle) anchorTitle.textContent = l.gTitle;
  $("#groundInputLabel")?.textContent = l.optWrite;
  if (groundHintTitle) groundHintTitle.textContent = l.needIdeas;
  $("#prevTxt")?.textContent = l.prev;
  $("#nextTxt")?.textContent = l.next;
  $("#restartTxt")?.textContent = l.restart;
  const restartFinalEl = $("#restartFinal");
  if (restartFinalEl) restartFinalEl.textContent = l.restart;

  if (doneTitleEl) doneTitleEl.textContent = l.doneTitle;
  if (howFeelEl) howFeelEl.textContent = l.howFeel;
  $("#feelGood")?.textContent = l.good;
  $("#feelBad")?.textContent  = l.bad;
  $("#goBreathe")?.textContent= l.breatheNow;
  const speakEl = $("#speakAloud");
  if (speakEl) speakEl.textContent = l.speakAloud;
  if (groundInput) groundInput.placeholder = l.placeholder;

  // Sonidos
  if (soundsTitle) soundsTitle.textContent = l.soundsTitle;
  if (lblRain)    lblRain.textContent     = l.rain;
  if (lblNature)  lblNature.textContent   = l.nature;
  if (lblSea)     lblSea.textContent      = l.sea;
  if (soundNote)  soundNote.textContent   = l.oneOnly;

  if (langBtn) langBtn.textContent = currentLang.toUpperCase();

  if (typeof renderStep === "function") renderStep();
}

langBtn?.addEventListener("click", ()=>{
  const langs = SUPPORTED_LANGS;
  let idx = langs.indexOf(currentLang);
  currentLang = langs[(idx+1)%langs.length];
  localStorage.setItem("sw_lang", currentLang);
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
  // En web cerramos overlay y no intentamos window.close() (puede estar bloqueado)
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
  // Solo ocultamos el overlay para no dejar la página bloqueada
  blackout.classList.remove('active');
  blackout.innerHTML = "";
}

// ===== respiración =====
function breathProfile(mode){
  if(mode==="sleep"){ return {inhale:4000, hold:7000, exhale:8000}; }
  else if(mode==="calm"){ return {inhale:4000, hold:0, exhale:6000}; }
  return {inhale:4000, hold:0, exhale:4000};
}
function scaleCircle(scale, ms){
  if (!circle) return;
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

    if (instruction) instruction.textContent = L.inhale;
    beep(523,0.10);
    scaleCircle(scaleInhale, prof.inhale);
    await wait(prof.inhale+40);
    if(!breathingRunning) break;

    if(prof.hold>0){
      if (instruction) instruction.textContent = L.hold;
      beep(440,0.10);
      scaleCircle(scaleHold, Math.max(300, prof.hold));
      await wait(prof.hold+40);
      if(!breathingRunning) break;
    }

    if (instruction) instruction.textContent = L.exhale;
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
  const breathingMsg = {
    es:"Respirando...", en:"Breathing...", pt:"Respirando...",
    fr:"Respiration...", it:"Respirazione...", de:"Atmung..."
  }[currentLang] || T[currentLang].pressStart;
  if (instruction) instruction.textContent = breathingMsg;
  hideBoth();
  breathingLoopPromise = breathingLoop();
}
function stopBreathing(){
  breathingRunning = false;
  if (instruction) instruction.textContent = T[currentLang].pressStart;
  scaleCircle(1.0,300);
  clearInterval(countdownIntervalId);
}

// ===== selector / countdown =====
function showSelector(){
  sessionControls?.classList.remove("hidden");
  countdownBox?.classList.add("hidden");
  if (sessionControls) sessionControls.style.display="";
  if (countdownBox) countdownBox.style.display="none";
}
function showCountdown(){
  sessionControls?.classList.add("hidden");
  countdownBox?.classList.remove("hidden");
  if (sessionControls) sessionControls.style.display="none";
  if (countdownBox) countdownBox.style.display="";
}
function hideBoth(){
  sessionControls?.classList.add("hidden");
  countdownBox?.classList.add("hidden");
  if (sessionControls) sessionControls.style.display="none";
  if (countdownBox) countdownBox.style.display="none";
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
    if (countdownEl) countdownEl.textContent = formatTime(left);
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
  const mins = parseInt(sessionSel?.value||"30",10);
  const end = Date.now() + mins*60*1000;
  showCountdown();
  startCountdown(end);
}

// ===== tabs (sin AndroidBridge, rápidos en web) =====
function switchSectionCore(targetId){
  $$('.section').forEach(sec=>{
    sec.classList.toggle('visible',sec.id===targetId);
    sec.hidden = sec.id!==targetId;
  });
  $$('.tab').forEach(b=>b.classList.remove('active'));
  const btn=[...$$('.tab')].find(b=>b.dataset.target===targetId);
  if(btn) btn.classList.add('active');

  if(targetId!=="breath-section") stopBreathing(); // NO paramos los sonidos ambientales
}
function switchSection(targetId){
  const current = document.querySelector('.tab.active')?.dataset.target;
  if (current === targetId) return;
  switchSectionCore(targetId);
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
    if (anchorProgress) anchorProgress.textContent = `${total} / ${total}`;
    if(progressFill) progressFill.style.width="100%";
    if (groundPrompt) groundPrompt.textContent="";
    if (groundInputs) groundInputs.style.display="none";
    $("#groundHint")?.removeAttribute("open");
    $("#groundActions")?.style && (document.getElementById("groundActions").style.display="none");
    if (groundDone) groundDone.hidden=false;
    if (feelMsgEl) feelMsgEl.hidden=true;
    return;
  }
  if (groundDone) groundDone.hidden=true;
  $("#groundActions")?.style && (document.getElementById("groundActions").style.display="");
  if (groundInputs) groundInputs.style.display="";
  if(progressFill){ progressFill.style.width=Math.round(stepIndex/total*100)+"%"; }
  if (anchorProgress) anchorProgress.textContent=`${stepIndex+1} / ${total}`;
  if (groundPrompt) groundPrompt.textContent=l.steps[stepIndex].label;
  if (groundHintTitle) groundHintTitle.textContent=l.needIdeas;
  if (groundHintsUl) groundHintsUl.innerHTML=l.steps[stepIndex].hints.map(h=>`<li>${h}</li>`).join("");
  if (groundInput) groundInput.value=notes[stepIndex]||"";
  if (prevStepBtn) prevStepBtn.disabled = stepIndex===0;
}
function saveCurrent(){ if (groundInput) notes[stepIndex]=groundInput.value.trim(); }
prevStepBtn?.addEventListener("click",()=>{ if(stepIndex>0){ saveCurrent(); stepIndex--; renderStep(); }});
nextStepBtn?.addEventListener("click",()=>{ saveCurrent(); stepIndex++; renderStep(); });
restartBtn?.addEventListener("click",()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill) progressFill.style.width="0%"; renderStep(); });
restartFinalBtn?.addEventListener("click",()=>{ stepIndex=0; notes=["","","","",""]; if(progressFill) progressFill.style.width="0%"; renderStep(); });

// Mensajes "me siento bien / mal" localizados
feelGoodBtn?.addEventListener("click",()=>{
  if (!feelMsgEl) return;
  feelMsgEl.hidden=false;
  const msg = {
    es:"Genial. Si querés, cerrá con una respiración tranquila. 💙",
    en:"Great. If you like, finish with a calm breath. 💙",
    pt:"Ótimo. Se quiser, finalize com uma respiração calma. 💙",
    fr:"Génial. Si vous voulez, terminez par une respiration calme. 💙",
    it:"Ottimo. Se vuoi, termina con un respiro calmo. 💙",
    de:"Super. Wenn Sie möchten, beenden Sie mit einem ruhigen Atemzug. 💙"
  }[currentLang];
  feelMsgEl.textContent = msg;
});
feelBadBtn?.addEventListener("click",()=>{
  if (!feelMsgEl) return;
  feelMsgEl.hidden=false;
  const msg = {
    es:"Está bien no estar bien. Repite el anclaje o pasa a una respiración suave.",
    en:"It's okay not to be okay. Repeat the grounding or switch to gentle breathing.",
    pt:"Tudo bem não estar bem. Repita a ancoragem ou mude para uma respiração suave.",
    fr:"C’est normal de ne pas aller bien. Répétez l’ancrage ou passez à une respiration douce.",
    it:"Va bene non stare bene. Ripeti il radicamento o passa a una respirazione dolce.",
    de:"Es ist okay, sich nicht gut zu fühlen. Wiederholen Sie die Erdung oder wechseln Sie zu ruhiger Atmung."
  }[currentLang];
  feelMsgEl.textContent = msg;
});
goBreatheBtn?.addEventListener("click",()=>{ switchSection("breath-section"); });

// ===== SONIDOS (web) =====
// En web no tenemos AndroidBridge. Este bloque es un placeholder por si luego sumás sonidos vía <audio>
let currentSound = null; // 'rain' | 'nature' | 'sea' | null
const playBtns = { rain: $("#play-rain"), nature: $("#play-nature"), sea: $("#play-sea") };
const stopBtns = { rain: $("#stop-rain"), nature: $("#stop-nature"), sea: $("#stop-sea") };

function setPlayingUI(key){
  Object.values(playBtns).forEach(b=>b && b.classList.remove("is-playing"));
  if (key && playBtns[key]) playBtns[key].classList.add("is-playing");
}

// Ejemplo de control básico si tenés etiquetas <audio id="aud-rain"> etc.
const audioEls = {
  rain:   document.getElementById("aud-rain"),
  nature: document.getElementById("aud-nature"),
  sea:    document.getElementById("aud-sea"),
};
function stopAllAudios(){
  Object.values(audioEls).forEach(a=>{
    if (a){ a.pause(); a.currentTime = 0; }
  });
}
function playSound(key){
  if (!audioEls[key]) return;
  stopAllAudios();
  audioEls[key].volume = Math.max(0, Math.min(1, parseFloat(volumeEl?.value || "0.6")));
  audioEls[key].loop = true;
  audioEls[key].play().catch(()=>{ /* autoplay bloqueado */ });
  currentSound = key;
  setPlayingUI(key);
}
function stopSound(){
  stopAllAudios();
  currentSound = null;
  setPlayingUI(null);
}

Object.keys(playBtns).forEach(key=>{
  const btn = playBtns[key];
  if (!btn) return;
  btn.addEventListener("click", ()=>{
    if (currentSound === key){ stopSound(); }
    else { playSound(key); }
  });
});
Object.values(stopBtns).forEach(btn=>{
  if (!btn) return;
  btn.addEventListener("click", ()=> stopSound());
});

// ===== init =====
document.addEventListener("DOMContentLoaded",()=>{
  applyLang();
  if(modeSel?.value==="sleep"){ showSelector(); } else { hideBoth(); }
  if (instruction) instruction.textContent=T[currentLang].pressStart;
  renderStep();

  // Sincronizar el volumen inicial de los <audio>
  const initV = Math.max(0, Math.min(1, parseFloat(volumeEl?.value || "0.6")));
  Object.values(audioEls).forEach(a=>{ if(a) a.volume = initV; });
});

// ===== eventos finales =====
soundToggle?.addEventListener("change",()=>{ if(!soundToggle.checked && audioCtx){ fadeMasterGain(0.5); }});

// Volumen para WebAudio y <audio>
function onVolChange(){
  const v = Math.max(0, Math.min(1, parseFloat(volumeEl?.value || "0.6")));
  if (gainNode) { gainNode.gain.value = v; }
  Object.values(audioEls).forEach(a=>{ if(a) a.volume = v; });
}
volumeEl?.addEventListener("input", onVolChange);
volumeEl?.addEventListener("change", onVolChange);

sessionSel?.addEventListener("change",()=>{ if(breathingRunning && modeSel?.value==="sleep"){ scheduleAutoStop(); showCountdown(); }});

// START “Dormir”: iniciar timer directo (sin interstitial en web)
startBtn?.addEventListener("click", ()=>{
  if (modeSel?.value==="sleep" && !breathingRunning){
    startBreathing();
    scheduleAutoStop();
    showCountdown();
  } else {
    startBreathing();
  }
});

modeSel?.addEventListener("change",()=>{
  if(!breathingRunning){
    if(modeSel.value==="sleep") showSelector(); else hideBoth();
  } else {
    if(modeSel.value==="sleep"){ scheduleAutoStop(); showCountdown(); }
    else { stopBreathing(); hideBoth(); }
  }
});

stopBtn?.addEventListener("click",()=>{
  stopBreathing();
  blackout?.classList.remove("active");
  if (blackout) blackout.innerHTML="";
});

