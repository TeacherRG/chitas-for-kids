/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Версия для Chitas for Kids (адаптировано под существующий HTML)
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

// Получаем индекс слова по позиции символа (если onboundary предоставляет charIndex)
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

/* ---------- SWITCH (используется глобальной кнопкой в HTML) ---------- */
function toggleSound(btn) {
  soundEnabled = !soundEnabled;
  btn.innerText = soundEnabled ? "🔊 Звук ВКЛ" : "🔇 Звук ВЫКЛ";

  if (!soundEnabled) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearHighlights();
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  }
}

/* ---------- SPEAK ---------- */
function speakText(text, block, button) {
  if (!text) return;

  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    console.warn("Web Speech API is not supported in this browser.");
    return;
  }

  // Если звук выключен — ничего не делаем
  if (!soundEnabled) {
    alert("Звук выключен! Включите звук кнопкой вверху страницы.");
    return;
  }

  // Если сейчас идёт проговаривание и пользователь нажал ту же кнопку
  if (speechSynthesis.speaking && currentUtterance) {
    if (button === currentButton) {
      if (isPaused || speechSynthesis.paused) {
        speechSynthesis.resume();
        isPaused = false;
        button.innerText = "⏸ Пауза";
      } else {
        speechSynthesis.pause();
        isPaused = true;
        button.innerText = "▶ Продолжить";
      }
      return;
    } else {
      // Нажали на другую кнопку — останавливаем текущее
      speechSynthesis.cancel();
      currentUtterance = null;
      currentButton = null;
      isPaused = false;
      clearHighlights();
    }
  } else {
    if (speechSynthesis.paused) {
      speechSynthesis.cancel();
      currentUtterance = null;
      currentButton = null;
      isPaused = false;
      clearHighlights();
    }
  }

  // Готовим utterance
  const utter = new SpeechSynthesisUtterance(text);
  currentUtterance = utter;
  currentButton = button;

  utter.lang = "ru-RU";
  utter.rate = 0.85;
  utter.pitch = 1.15;

  // подготовка слов для подсветки
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

      if (activeIndex < 0) return;

      lastActiveIndex = activeIndex;
      highlightWord(block, words, activeIndex);
    } catch (err) {
      console.error("onboundary handler error:", err);
    }
  };

  utter.onstart = () => {
    try {
      button.innerText = "⏸ Пауза";
      isPaused = false;
    } catch (err) {
      console.error("onstart handler error:", err);
    }
  };

  utter.onend = () => {
    try {
      button.innerText = "🔊 Прочитай";
      clearHighlights(block);
      currentUtterance = null;
      currentButton = null;
      isPaused = false;
    } catch (err) {
      console.error("onend handler error:", err);
    }
  };

  utter.onerror = (ev) => {
    console.error("SpeechSynthesis error:", ev);
    button.innerText = "🔊 Прочитай";
    clearHighlights(block);
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  };

  try {
    speechSynthesis.speak(utter);
  } catch (err) {
    console.error("speechSynthesis.speak() failed:", err);
    button.innerText = "🔊 Прочитай";
    currentUtterance = null;
    currentButton = null;
    isPaused = false;
  }
}

/* ---------- HIGHLIGHT ---------- */
function highlightWord(block, words, activeIndex) {
  const ttsTextElement = block.querySelector(".tts-text");
  if (!ttsTextElement) return;

  // Строим html, экранируем текст
  const html = words
    .map((w, i) =>
      i === activeIndex ? `<span class="tts-highlight">${escapeHtml(w)}</span>` : escapeHtml(w)
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
    const parent = el.closest("[data-original-html]") || el.parentElement;
    if (parent && parent.hasAttribute && parent.hasAttribute("data-original-html")) {
      el.innerHTML = parent.getAttribute("data-original-html");
    } else {
      const textContent = el.textContent;
      el.textContent = textContent;
    }
  });
}

/* ---------- BUTTONS ---------- */
function addReadButtons() {
  // Ищем параграфы с классами из HTML структуры
  const selectors = [
    ".story-text p",           // параграфы в story-text
    ".story-paragraph",         // отдельные параграфы
    ".section-content > p",     // параграфы внутри section-content
    ".content-block"            // блоки контента
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((block) => {
      // Пропускаем, если кнопка уже есть
      if (block.querySelector(".read-btn")) return;

      // Получаем текст блока
      const text = block.textContent.trim();
      if (!text || text.length < 10) return;

      const originalHTML = block.innerHTML;

      // Создаем контейнер для кнопки и текста
      const container = document.createElement("div");
      container.style.marginBottom = "15px";

      // Создаем кнопку
      const btn = document.createElement("button");
      btn.className = "read-btn";
      btn.innerHTML = "🔊 Прочитай";
      btn.style.cssText = "margin-right: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9em;";
      btn.onmouseover = function() { this.style.background = "#45a049"; };
      btn.onmouseout = function() { this.style.background = "#4CAF50"; };
      btn.onclick = () => speakText(text, wrapper, btn);

      // Создаем обертку для текста
      const wrapper = document.createElement("div");
      wrapper.className = "tts-text";
      wrapper.innerHTML = originalHTML;
      wrapper.setAttribute("data-original-html", originalHTML);

      // Собираем всё вместе
      container.appendChild(btn);
      container.appendChild(wrapper);
      
      // Заменяем оригинальный контент
      block.innerHTML = "";
      block.appendChild(container);
    });
  });

  console.log("✅ Read buttons added");
}

/* ---------- INIT ---------- */
function initTextToSpeech() {
  console.log("🔊 Initializing Text-to-Speech...");
  
  // Проверяем поддержку браузера
  if (!('speechSynthesis' in window)) {
    console.warn("⚠️ Web Speech API not supported in this browser");
    return;
  }

  // Добавляем кнопки чтения
  addReadButtons();
  
  console.log("✅ Text-to-Speech initialized successfully");
}

// Экспортируем для использования в основном коде
window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
window.toggleSound = toggleSound;
