let interval;
let currentLang = "es";

/* =========================
   i18n
========================= */
const translations = {
  es: {
    app: "SootheWave",
    pressStart: "Presiona iniciar",
    inhale: "Inhala",
    hold: "Mantén",
    exhale: "Exhala",
    start: "Iniciar",
    stop: "Detener",
    modeLabel: "Modo:",
    langLabel: "Idioma",
    sound: "Sonido",
    // Tabs
    tabBreath: "Respiración",
    tabGround: "Anclaje",
    // Grounding (Anclaje)
    groundTitle: "Anclaje (TCC)",
    steps: [
      { count: 5, label: "5 cosas que veas", hintTitle: "Sugerencias", hints: ["Colores, formas, objetos, luces, sombras."] },
      { count: 2, label: "2 cosas que escuches", hintTitle: "Sugerencias", hints: ["Ruidos lejanos, tu respiración, ventilador, tráfico."] },
      { count: 2, label: "2 olores (si no hay, recuerda algunos)", hintTitle: "Sugerencias", hints: ["Café, jabón, madera, perfume (o recuerdos de olores)."] },
      { count: 2, label: "2 sabores que sientas/recuerdes", hintTitle: "Sugerencias", hints: ["Menta, dulce, amargo, agua, recuerdo de un sabor."] },
      { count: 2, label: "2 texturas que puedas sentir", hintTitle: "Sugerencias", hints: ["Ropa, silla, piel, temperatura, objeto cercano."] }
    ],
    optionalWrite: "(Opcional) Escribe lo que observes",
    next: "Siguiente",
    back: "Volver",
    skipWrite: "Saltar escritura",
    doneText: "¡Listo! Respira profundo y agradece este momento.",
    restart: "Repetir"
  },
  en: {
    app: "SootheWave",
    pressStart: "Press start",
    inhale: "Inhale",
    hold: "Hold",
    exhale: "Exhale",
    start: "Start",
    stop: "Stop",
    modeLabel: "Mode:",
    langLabel: "Language",
    sound: "Sound",
    // Tabs
    tabBreath: "Breathing",
    tabGround: "Grounding",
    // Grounding
    groundTitle: "Grounding (CBT)",
    steps: [
      { count: 5, label: "5 things you can see", hintTitle: "Hints", hints: ["Colors, shapes, objects, lights, shadows."] },
      { count: 2, label: "2 things you can hear", hintTitle: "Hints", hints: ["Distant noises, your breath, fan, traffic."] },
      { count: 2, label: "2 smells (or recall some)", hintTitle: "Hints", hints: ["Coffee, soap, wood, perfume (or memories of smells)."] },
      { count: 2, label: "2 tastes you feel/recall", hintTitle: "Hints", hints: ["Mint, sweet, bitter, water, a remembered taste."] },
      { count: 2, label: "2 textures you can feel", hintTitle: "Hints", hints: ["Clothes, chair, skin, temperature, a nearby object."] }
    ],
    optionalWrite: "(Optional) Write what you notice",
    next: "Next",
    back: "Back",
    skipWrite: "Skip writing",
    doneText: "Done! Take a deep breath and appreciate this moment.",
    restart: "Restart"
  }
};

function detectInitialLanguage() {
  const saved = localStorage.getItem("breath_lang");
  if (saved && translations[saved]) return saved;
  const nav = (navigator.language || navigator.userLanguage || "es").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

function applyTranslations() {
  const t = translations[currentLang];
  document.documentElement.setAttribute("lang", currentLang);
  document.title = `${t.app} – ${t.inhale}/${t.exhale}`;

  // Header & breathing labels
  document.getElementById("title").innerText = t.app;
  document.getElementById("instruction").innerText = t.pressStart;
  document.getElementById("modeLabel").innerText = t.modeLabel;
  document.getElementById("langLabel").innerText = t.langLabel;
  document.getElementById("soundLabel").innerText = t.sound;
  document.getElementById("startBtn").innerText = t.start;
  document.getElementById("stopBtn").innerText = t.stop;

  // Tabs
  document.getElementById("tab-breath").innerText = t.tabBreath;
  document.getElementById("tab-ground").innerText = t.tabGround;

  // Grounding UI
  document.getElementById("groundTitle").innerText = t.groundTitle;
  document.getElementById("groundLabel").innerText = t.optionalWrite;
  document.getElementById("nextLabel").innerText = t.next;
  document.getElementById("backLabel").innerText = t.back;
  document.getElementById("skipLabel").innerText = t.skipWrite;
  document.getElementById("groundDoneText").innerText = t.doneText;
  document.getElementById("restartLabel").innerText = t.restart;

  renderGroundStep(); // re-render con idioma
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("breath_lang", lang);
  document.getElementById("language").value = lang;
  applyTranslations();
}

/* =========================
   Web Audio (sonidos)
========================= */
let audioCtx = null;
const volumeNode = { node: null, get gain() { return this.node ? this.node.gain : null; } };

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    volumeNode.node = audioCtx.createGain();
    volumeNode.node.gain.value = parseFloat(document.getElementById("volume").value || "0.5");
    volumeNode.node.connect(audioCtx.destination);
  }
}

function playTone({ freq = 440, type = "sine", duration = 0.5, fade = 0.02 }) {
  const soundOn = document.getElementById("soundToggle").checked;
  if (!soundOn) return;

  ensureAudio();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  const now = audioCtx.currentTime;
  const attack = fade;
  const release = fade;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volumeNode.node.gain.value, now + attack);
  gain.gain.setValueAtTime(volumeNode.node.gain.value, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(volumeNode.node);
  osc.start(now);
  osc.stop(now + duration);
}

function playInhaleCue(ms) { playTone({ freq: 392, type: "sine", duration: Math.min(ms / 1000, 0.5) }); }
function playHoldCue() { playTone({ freq: 660, type: "triangle", duration: 0.15 }); }
function playExhaleCue(ms) { playTone({ freq: 329.6, type: "sine", duration: Math.min(ms / 1000, 0.4) }); }

/* =========================
   Respiración
========================= */
function startBreathing() {
  stopBreathing();

  const modeValue = document.getElementById("mode").value;
  let inhale = 4000, exhale = 4000, hold = 0;

  if (modeValue === "calm") { inhale = 4000; exhale = 6000; }
  if (modeValue === "sleep") { inhale = 4000; hold = 7000; exhale = 8000; }

  const circle = document.getElementById("circle");
  const instr = document.getElementById("instruction");
  const t = translations[currentLang];

  ensureAudio();

  function cycle() {
    // Inhala
    instr.innerText = t.inhale;
    circle.style.setProperty("--phase-duration", `${inhale}ms`);
    setTimeout(() => { circle.style.transform = "scale(1.5)"; }, 20);
    playInhaleCue(inhale);

    // Mantén
    setTimeout(() => {
      if (hold > 0) {
        instr.innerText = t.hold;
        playHoldCue();
      }
    }, inhale);

    // Exhala
    setTimeout(() => {
      instr.innerText = t.exhale;
      circle.style.setProperty("--phase-duration", `${exhale}ms`);
      circle.style.transform = "scale(1)";
      playExhaleCue(exhale);
    }, inhale + hold);
  }

  cycle();
  interval = setInterval(cycle, inhale + hold + exhale);
}

function stopBreathing() {
  clearInterval(interval);
  const t = translations[currentLang];
  document.getElementById("instruction").innerText = t.pressStart;
  document.getElementById("circle").style.transform = "scale(1)";
}

/* =========================
   Tabs (Respiración / Anclaje)
========================= */
function switchSection(targetId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.getElementById(targetId).classList.add('visible');

  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  const btn = [...document.querySelectorAll('.tab')].find(b => b.dataset.target === targetId);
  if (btn) btn.classList.add('active');

  // Si salgo de respiración, detengo el ciclo
  if (targetId !== 'breath-section') stopBreathing();
}

/* =========================
   Anclaje (Grounding TCC)
========================= */
let groundStep = 0;
let groundNotes = ["", "", "", "", ""]; // opcional: almacenar lo escrito

function renderGroundStep() {
  const t = translations[currentLang];
  const steps = t.steps;
  const lastIndex = steps.length - 1;

  const title = document.getElementById("groundTitle");
  title.innerText = t.groundTitle;

  const prompt = document.getElementById("groundPrompt");
  const progress = document.getElementById("groundProgress");
  const hintTitle = document.getElementById("groundHintTitle");
  const hintList = document.getElementById("groundHintList");
  const textarea = document.getElementById("groundText");
  const doneBox = document.getElementById("groundDone");

  if (groundStep > lastIndex) {
    // Terminado
    prompt.innerHTML = "";
    progress.innerText = `${steps.length} / ${steps.length}`;
    doneBox.hidden = false;
    document.getElementById("groundBack").disabled = false;
    document.getElementById("groundSkip").disabled = true;
    document.getElementById("groundNext").disabled = true;
    return;
  }

  // Paso activo
  doneBox.hidden = true;
  const s = steps[groundStep];
  progress.innerText = `${groundStep + 1} / ${steps.length}`;
  prompt.innerHTML = `${currentLang === "es" ? "Nombra" : "Name"} <strong>${s.label}</strong>.`;

  // Sugerencias
  hintTitle.innerText = s.hintTitle;
  hintList.innerHTML = s.hints.map(h => `<li>${h}</li>`).join("");

  // Rellenar lo que el usuario ya escribió (si vuelve atrás)
  textarea.value = groundNotes[groundStep] || "";

  // Botones
  document.getElementById("groundBack").disabled = (groundStep === 0);
  document.getElementById("groundSkip").disabled = false;
  document.getElementById("groundNext").disabled = false;
}

function groundSaveCurrent() {
  const val = document.getElementById("groundText").value.trim();
  groundNotes[groundStep] = val; // guardar (opcional)
}

function groundNext() {
  groundSaveCurrent();
  groundStep++;
  renderGroundStep();
}

function groundBack() {
  if (groundStep === 0) return;
  groundSaveCurrent();
  groundStep--;
  renderGroundStep();
}

function groundSkip() {
  document.getElementById("groundText").value = "";
  groundNotes[groundStep] = "";
  groundNext();
}

function groundRestart() {
  groundStep = 0;
  groundNotes = ["", "", "", "", ""];
  renderGroundStep();
}

/* =========================
   Eventos
========================= */
function wireEvents() {
  // Respiración
  document.getElementById("startBtn").addEventListener("click", startBreathing);
  document.getElementById("stopBtn").addEventListener("click", stopBreathing);

  // Volumen/sonido
  document.getElementById("soundToggle").addEventListener("change", () => {
    if (document.getElementById("soundToggle").checked) ensureAudio();
  });
  document.getElementById("volume").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value || "0.5");
    if (volumeNode.node) volumeNode.node.gain.value = v;
  });

  // Idioma
  document.getElementById("language").addEventListener("change", (e) => {
    setLanguage(e.target.value);
  });

  // Tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.target));
  });

  // Grounding
  document.getElementById("groundNext").addEventListener("click", groundNext);
  document.getElementById("groundBack").addEventListener("click", groundBack);
  document.getElementById("groundSkip").addEventListener("click", groundSkip);
  document.getElementById("groundRestart").addEventListener("click", groundRestart);
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  currentLang = detectInitialLanguage();
  applyTranslations();
  wireEvents();
  document.getElementById("language").value = currentLang;

  // Estado inicial grounding
  renderGroundStep();
});