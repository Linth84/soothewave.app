let interval;
let currentLang = "es";

// --- i18n ---
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
    modes: {
      relax: "Relajación (4-4)",
      calm: "Calma (4-6)",
      sleep: "Dormir (4-7-8)"
    }
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
    modes: {
      relax: "Relax (4-4)",
      calm: "Calm (4-6)",
      sleep: "Sleep (4-7-8)"
    }
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

  document.getElementById("title").innerText = t.app;
  document.getElementById("instruction").innerText = t.pressStart;

  document.getElementById("modeLabel").innerText = t.modeLabel;
  const mode = document.getElementById("mode");
  mode.options[0].text = t.modes.relax;
  mode.options[1].text = t.modes.calm;
  mode.options[2].text = t.modes.sleep;

  document.getElementById("langLabel").innerText = t.langLabel;
  document.getElementById("soundLabel").innerText = t.sound;

  document.getElementById("startBtn").innerText = t.start;
  document.getElementById("stopBtn").innerText = t.stop;
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("breath_lang", lang);
  document.getElementById("language").value = lang;
  applyTranslations();
}

// --- Web Audio (sonidos sin archivos) ---
let audioCtx = null;
const volumeNode = (() => {
  // creado al tocar Start o al activar sonido
  return { node: null, get gain() { return this.node ? this.node.gain : null; } };
})();

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

  // ADSR simple: fade in/out suave
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

function playInhaleCue(ms) {
  // tono suave un poco más grave (respirar hondo)
  playTone({ freq: 392, type: "sine", duration: Math.min(ms / 1000, 0.5) });
}

function playHoldCue() {
  // bip corto para recordar sostener
  playTone({ freq: 660, type: "triangle", duration: 0.15 });
}

function playExhaleCue(ms) {
  // tono un poco más bajo, breve
  playTone({ freq: 329.6, type: "sine", duration: Math.min(ms / 1000, 0.4) });
}

// --- Lógica de respiración ---
function startBreathing() {
  stopBreathing(); // reset si ya corría

  const modeValue = document.getElementById("mode").value;
  let inhale = 4000, exhale = 4000, hold = 0;

  if (modeValue === "calm") { inhale = 4000; exhale = 6000; }
  if (modeValue === "sleep") { inhale = 4000; hold = 7000; exhale = 8000; }

  const circle = document.getElementById("circle");
  const instr = document.getElementById("instruction");
  const t = translations[currentLang];

  // Desbloquear audio en el primer gesto del usuario si está pausado por política del navegador
  ensureAudio();

  function cycle() {
    // 1) Inhala
    instr.innerText = t.inhale;
    circle.style.setProperty("--phase-duration", `${inhale}ms`);
    // pequeño delay para forzar transición desde scale(1)
    setTimeout(() => { circle.style.transform = "scale(1.5)"; }, 20);
    playInhaleCue(inhale);

    // 2) Mantén (si aplica)
    setTimeout(() => {
      if (hold > 0) {
        instr.innerText = t.hold;
        playHoldCue();
      }
    }, inhale);

    // 3) Exhala
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

// --- Eventos UI ---
function wireEvents() {
  document.getElementById("startBtn").addEventListener("click", startBreathing);
  document.getElementById("stopBtn").addEventListener("click", stopBreathing);

  document.getElementById("language").addEventListener("change", (e) => {
    setLanguage(e.target.value);
  });

  document.getElementById("soundToggle").addEventListener("change", () => {
    if (document.getElementById("soundToggle").checked) ensureAudio();
  });

  document.getElementById("volume").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value || "0.5");
    if (volumeNode.node) volumeNode.node.gain.value = v;
  });
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  currentLang = detectInitialLanguage();
  applyTranslations();
  wireEvents();
  document.getElementById("language").value = currentLang;
});



