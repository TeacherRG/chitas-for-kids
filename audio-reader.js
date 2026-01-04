/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Улучшенная версия с очисткой текста
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

/**
 * Очистка текста от знаков препинания и специальных символов
 */
function cleanTextForSpeech(text) {
  return text
    // Убираем эмодзи
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    // Убираем специальные символы (сохраняем только буквы, цифры, пробелы, основные знаки)
    .replace(/[^\u0400-\u04FF\w\s.,!?—–-]/g, ' ')
    // Заменяем двоеточия и точки с запятой на паузы
    .replace(/[:;]/g, ',')
    // Заменяем кавычки на пробелы
    .replace(/[«»""'']/g, ' ')
    // Заменяем тире на паузу
    .replace(/[—–]/g, ' - ')
    // Убираем множественные пробелы
    .replace(/\s+/g, ' ')
    // Убираем пробелы перед знаками препинания
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

/* ---------- SWITCH ---------- */
function toggleSound(btn) {
  soundEnabled = !soundEnabled;
  btn.innerText = soundEnabled ? "🔊 Звук ВКЛ" : "🔇 Звук ВЫКЛ";

  if (!soundEnabled) {
    // Останавливаем ResponsiveVoice
    if (window.responsiveVoice && responsiveVoice.isPlaying()) {
      responsiveVoice.cancel();
    }

    // Сбрасываем состояние в основном приложении
    if (window.chitasApp) {
      window.chitasApp.isPlaying = false;
      window.chitasApp.isPaused = false;
      const speakBtn = document.getElementById('speakBtn');
      if (speakBtn) speakBtn.innerHTML = "🔊";
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

  // Если уже играет та же кнопка - пауза/возобновление
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

  // Если играет другая кнопка - останавливаем
  if (isPlaying) {
    responsiveVoice.cancel();
    if (currentButton) {
      currentButton.innerHTML = "🔊 Прочитай";
    }
    clearHighlights();
  }

  // Очищаем текст от знаков препинания и эмодзи
  const cleanText = cleanTextForSpeech(text);
  console.log("📝 Original text length:", text.length);
  console.log("✨ Cleaned text length:", cleanText.length);

  currentButton = button;
  isPlaying = true;
  button.innerHTML = "⏸ Пауза";

  // Улучшенные параметры озвучивания
  const params = {
    pitch: 1.0,           // Нормальная высота голоса
    rate: 0.9,            // Чуть медленнее для лучшего понимания
    volume: 1.0,          // Максимальная громкость
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
    },
    onerror: (error) => {
      console.error("❌ Error:", error);
      button.innerHTML = "🔊 Прочитай";
      currentButton = null;
      isPaused = false;
      isPlaying = false;
    }
  };

  // Используем Russian Female голос (лучшее качество для русского)
  responsiveVoice.speak(cleanText, "Russian Female", params);
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
    readBtn.title = "Озвучить текст раздела";

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

  // Настройка ResponsiveVoice для лучшего качества
  if (responsiveVoice.voiceSupport()) {
    console.log("✅ Voice support detected");
  }

  setTimeout(() => {
    addReadButtons();
    console.log("✅ Initialized");
  }, 500);
}

window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
window.toggleSound = toggleSound;

console.log("📦 audio-reader.js (improved) loaded");
