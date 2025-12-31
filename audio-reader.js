/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Версия с ResponsiveVoice API для Chitas for Kids
   =============================== */

let currentButton = null;
let isPaused = false;
let soundEnabled = true;
let isPlaying = false;

/* ---------- HELPERS ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- SWITCH ---------- */
function toggleSound(btn) {
  soundEnabled = !soundEnabled;
  btn.innerText = soundEnabled ? "🔊 Звук ВКЛ" : "🔇 Звук ВЫКЛ";

  if (!soundEnabled) {
    if (window.responsiveVoice && responsiveVoice.isPlaying()) {
      responsiveVoice.cancel();
    }
    clearHighlights();
    currentButton = null;
    isPaused = false;
    isPlaying = false;
    
    document.querySelectorAll('.read-btn').forEach(btn => {
      btn.innerHTML = "🔊 Прочитай";
    });
  }
}

/* ---------- SPEAK ---------- */
function speakText(text, contentElement, button) {
  console.log("🔊 speakText called");
  
  if (!text) return;

  if (!soundEnabled) {
    alert("Звук выключен!");
    return;
  }

  if (!window.responsiveVoice) {
    alert("Система озвучивания загружается...");
    return;
  }

  if (isPlaying && button === currentButton) {
    if (isPaused) {
      responsiveVoice.resume();
      isPaused = false;
      button.innerHTML = "⏸ Пауза";
    } else {
      responsiveVoice.pause();
      isPaused = true;
      button.innerHTML = "▶ Продолжить";
    }
    return;
  }

  if (isPlaying) {
    responsiveVoice.cancel();
    if (currentButton) {
      currentButton.innerHTML = "🔊 Прочитай";
    }
    clearHighlights();
  }

  currentButton = button;
  isPlaying = true;
  button.innerHTML = "⏸ Пауза";

  const params = {
    pitch: 1.0,
    rate: 0.85,
    volume: 1.0,
    onstart: () => {
      console.log("✅ Started");
      button.innerHTML = "⏸ Пауза";
    },
    onend: () => {
      console.log("✅ Ended");
      button.innerHTML = "🔊 Прочитай";
      clearHighlights(contentElement);
      currentButton = null;
      isPaused = false;
      isPlaying = false;
    }
  };

  responsiveVoice.speak(text, "Russian Female", params);
}

/* ---------- HIGHLIGHT ---------- */
function clearHighlights(scope) {
  let elements = scope 
    ? Array.from(scope.querySelectorAll(".tts-text"))
    : Array.from(document.querySelectorAll(".tts-text"));

  elements.forEach((el) => {
    if (el.hasAttribute("data-original-html")) {
      el.innerHTML = el.getAttribute("data-original-html");
    }
  });
}

/* ---------- BUTTONS ---------- */
function addReadButtons() {
  console.log("🔊 Adding buttons...");
  
  document.querySelectorAll('.section').forEach((section, index) => {
    if (section.querySelector('.read-btn')) return;

    const contentElement = section.querySelector('.section-content');
    if (!contentElement) return;

    const text = contentElement.textContent.trim();
    if (!text || text.length < 20) return;

    const originalHTML = contentElement.innerHTML;

    const readBtn = document.createElement("button");
    readBtn.className = "read-btn";
    readBtn.innerHTML = "🔊 Прочитай";
    readBtn.type = "button";
    
    const textWrapper = document.createElement("div");
    textWrapper.className = "tts-text";
    textWrapper.innerHTML = originalHTML;
    textWrapper.setAttribute("data-original-html", originalHTML);

    readBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakText(text, contentElement, readBtn);
    };

    contentElement.innerHTML = "";
    contentElement.appendChild(readBtn);
    contentElement.appendChild(textWrapper);
  });
  
  console.log("✅ Buttons added");
}

/* ---------- INIT ---------- */
function initTextToSpeech() {
  console.log("🎤 Initializing...");
  
  if (!window.responsiveVoice) {
    console.warn("⚠️ Waiting for ResponsiveVoice...");
    setTimeout(initTextToSpeech, 1000);
    return;
  }

  setTimeout(() => {
    addReadButtons();
    console.log("✅ Initialized");
  }, 500);
}

window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
window.toggleSound = toggleSound;

console.log("📦 audio-reader.js loaded");
