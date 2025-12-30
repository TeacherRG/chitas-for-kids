/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Версия с одной кнопкой на раздел для Chitas for Kids
   =============================== */

let currentUtterance = null;
let currentButton = null;
let isPaused = false;
let soundEnabled = true;

/* ---------- HELPERS ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getWordIndexFromCharIndex(text, charIndex) {
  if (charIndex == null) return -1;
  const wordRegex = /\S+/g;
  let match;
  let i = 0;
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index <= charIndex && charIndex < match.index + match[0].length) {
      return i;
    }
    i++;
  }
  return i - 1;
}

/* ---------- SWITCH ---------- */
function toggleSound(btn) {
  soundEnabled = !soundEnabled;
  btn.innerText = soundEnabled ? "🔊 Звук ВКЛ" : "🔇 Звук ВЫКЛ";

  if (!soundEnabled) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearHighlights();
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
    
    // Сбрасываем все кнопки
    document.querySelectorAll('.read-btn').forEach(btn => {
      btn.innerHTML = "🔊 Прочитай";
    });
  }
}

/* ---------- SPEAK ---------- */
function speakText(text, contentElement, button) {
  console.log("🔊 speakText called", { textLength: text.length, soundEnabled });
  
  if (!text) {
    console.warn("No text to speak");
    return;
  }

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    alert("Ваш браузер не поддерживает озвучивание текста");
    console.warn("Web Speech API is not supported");
    return;
  }

  if (!soundEnabled) {
    alert("Звук выключен! Включите звук кнопкой вверху страницы.");
    return;
  }

  // Если уже играет та же кнопка - пауза/возобновление
  if (speechSynthesis.speaking && currentUtterance && button === currentButton) {
    if (isPaused || speechSynthesis.paused) {
      console.log("▶ Resuming speech");
      speechSynthesis.resume();
      isPaused = false;
      button.innerHTML = "⏸ Пауза";
    } else {
      console.log("⏸ Pausing speech");
      speechSynthesis.pause();
      isPaused = true;
      button.innerHTML = "▶ Продолжить";
    }
    return;
  }

  // Если играет другая кнопка - останавливаем
  if (speechSynthesis.speaking) {
    console.log("🛑 Stopping current speech");
    speechSynthesis.cancel();
    if (currentButton) {
      currentButton.innerHTML = "🔊 Прочитай";
    }
    clearHighlights();
  }

  console.log("🎤 Starting new speech");
  
  const utter = new SpeechSynthesisUtterance(text);
  currentUtterance = utter;
  currentButton = button;

  utter.lang = "ru-RU";
  utter.rate = 0.85;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  const words = text.trim().split(/\s+/);
  let lastActiveIndex = -1;

  utter.onboundary = (e) => {
    try {
      let activeIndex = -1;
      if (typeof e.charIndex === "number") {
        activeIndex = getWordIndexFromCharIndex(text, e.charIndex);
      } else if (e.name === "word") {
        activeIndex = lastActiveIndex + 1;
      }

      if (activeIndex >= 0 && activeIndex < words.length) {
        lastActiveIndex = activeIndex;
        highlightWord(contentElement, words, activeIndex);
      }
    } catch (err) {
      console.error("onboundary error:", err);
    }
  };

  utter.onstart = () => {
    console.log("✅ Speech started");
    button.innerHTML = "⏸ Пауза";
    isPaused = false;
  };

  utter.onend = () => {
    console.log("✅ Speech ended");
    button.innerHTML = "🔊 Прочитай";
    clearHighlights(contentElement);
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  };

  utter.onerror = (ev) => {
    console.error("❌ Speech error:", ev);
    button.innerHTML = "🔊 Прочитай";
    clearHighlights(contentElement);
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  };

  try {
    speechSynthesis.speak(utter);
    console.log("🎵 Speech queued");
  } catch (err) {
    console.error("❌ speechSynthesis.speak() failed:", err);
    alert("Ошибка при запуске озвучивания: " + err.message);
    button.innerHTML = "🔊 Прочитай";
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  }
}

/* ---------- HIGHLIGHT ---------- */
function highlightWord(contentElement, words, activeIndex) {
  if (!contentElement) return;
  
  const ttsTextElement = contentElement.querySelector(".tts-text");
  if (!ttsTextElement) return;

  const html = words
    .map((w, i) =>
      i === activeIndex 
        ? `<span class="tts-highlight">${escapeHtml(w)}</span>` 
        : escapeHtml(w)
    )
    .join(" ");

  ttsTextElement.innerHTML = html;
}

function clearHighlights(scope) {
  let elements;
  if (scope) {
    const nodeList = scope.querySelectorAll(".tts-text");
    elements = Array.from(nodeList);
  } else {
    const nodeList = document.querySelectorAll(".tts-text");
    elements = Array.from(nodeList);
  }

  elements.forEach((el) => {
    if (el.hasAttribute("data-original-html")) {
      el.innerHTML = el.getAttribute("data-original-html");
    }
  });
}

/* ---------- BUTTONS ---------- */
function addReadButtons() {
  console.log("🔊 Adding read buttons to sections...");
  
  // Находим все секции
  const sections = document.querySelectorAll('.section');
  
  sections.forEach((section, index) => {
    // Проверяем, нет ли уже кнопки
    if (section.querySelector('.read-btn')) {
      console.log(`Section ${index} already has a button`);
      return;
    }

    // Находим контент секции
    const contentElement = section.querySelector('.section-content');
    if (!contentElement) {
      console.log(`Section ${index} has no content`);
      return;
    }

    // Получаем весь текст секции
    const text = contentElement.textContent.trim();
    if (!text || text.length < 20) {
      console.log(`Section ${index} has insufficient text`);
      return;
    }

    console.log(`Adding button to section ${index}, text length: ${text.length}`);

    // Сохраняем оригинальный HTML
    const originalHTML = contentElement.innerHTML;

    // Создаём кнопку "Прочитай"
    const readBtn = document.createElement("button");
    readBtn.className = "read-btn";
    readBtn.innerHTML = "🔊 Прочитай";
    readBtn.type = "button";
    
    // Создаём обёртку для текста
    const textWrapper = document.createElement("div");
    textWrapper.className = "tts-text";
    textWrapper.innerHTML = originalHTML;
    textWrapper.setAttribute("data-original-html", originalHTML);

    // Обработчик клика
    readBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🖱️ Read button clicked for section", index);
      speakText(text, contentElement, readBtn);
    };

    // Вставляем кнопку в начало контента
    contentElement.innerHTML = "";
    contentElement.appendChild(readBtn);
    contentElement.appendChild(textWrapper);
  });
  
  console.log("✅ Read buttons added to all sections");
}

/* ---------- INIT ---------- */
function initTextToSpeech() {
  console.log("🎤 Initializing Text-to-Speech...");
  
  // Проверяем поддержку браузера
  if (!('speechSynthesis' in window)) {
    console.warn("⚠️ Web Speech API not supported in this browser");
    alert("Ваш браузер не поддерживает озвучивание текста");
    return;
  }

  // Даём время загрузиться DOM
  setTimeout(() => {
    addReadButtons();
    console.log("✅ Text-to-Speech initialized");
  }, 500);
}

// Экспортируем функции глобально
window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
window.toggleSound = toggleSound;
window.speakText = speakText;

console.log("📦 audio-reader.js loaded");
