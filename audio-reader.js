/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Исправленная версия для Chitas for Kids
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
  // Ищем все слова и их позиции
  const wordRegex = /\S+/g;
  let match;
  let i = 0;
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index <= charIndex && charIndex < match.index + match[0].length) {
      return i;
    }
    i++;
  }
  return i - 1; // fallback
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
  if (!soundEnabled) return;

  // Если сейчас идёт проговаривание и пользователь нажал ту же кнопку — переключаем паузу/продолжение
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
      // Нажали на другую кнопку — останавливаем текущее и запускаем новое
      speechSynthesis.cancel();
      currentUtterance = null;
      currentButton = null;
      isPaused = false;
      clearHighlights();
    }
  } else {
    // если paused (не speaking), но есть состояние паузы — сбросим (без гарантии)
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

  // подготовка слов для подсветки (чистый текст)
  const words = text.trim().split(/\s+/);
  let lastActiveIndex = -1;

  utter.onboundary = (e) => {
    try {
      // В некоторых реализациях e.name может быть undefined, но есть e.charIndex
      let activeIndex = -1;
      if (typeof e.charIndex === "number") {
        activeIndex = getWordIndexFromCharIndex(text, e.charIndex);
      } else if (e.name === "word") {
        // fallback: инкрементируем индекс
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
  // Если передан конкретный блок — восстановим в нем оригинал, иначе по всему документу
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
      // fallback: используем текстовое содержимое (без HTML)
      const textContent = el.textContent;
      el.textContent = textContent;
    }
  });
}

/* ---------- BUTTONS ---------- */
function addReadButtons() {
  // Ищем параграфы и секции с текстом
  document.querySelectorAll(".story-paragraph, .section-content, .content-block").forEach((block) => {
    // Пропускаем, если кнопка уже есть
    if (block.querySelector(".read-btn")) return;

    // Получаем текст блока (чистый текст) и HTML (для восстановления)
    const text = block.textContent.trim();
    if (!text || text.length < 10) return;

    const originalHTML = block.innerHTML;

    // Создаем обертку для текста (сохранение HTML внутри)
    const wrapper = document.createElement("span");
    wrapper.className = "tts-text";
    // Сохраняем оригинальный HTML внутри wrapper, чтобы можно было восстановить стили/ссылки и т.д.
    wrapper.innerHTML = originalHTML;

    // Сохраняем оригинальный HTML на родительском элементе для восстановления
    block.setAttribute("data-original-html", originalHTML);

    // Очищаем блок и добавляем кнопку + обертку
    block.innerHTML = "";
    const btn = document.createElement("button");
    btn.className = "read-btn";
    btn.innerHTML = "🔊 Прочитай";
    btn.onclick = () => speakText(text, block, btn);

    // Добавляем кнопку и текст
    block.appendChild(btn);
    block.appendChild(wrapper);
  });
}

/* ---------- INIT ---------- */
function initTextToSpeech() {
  // Проверяем, не была ли уже добавлена кнопка звука
  if (document.querySelector(".sound-toggle")) {
    console.log("Sound toggle already exists, skipping initialization");
    return;
  }

  // Добавляем кнопку переключения звука
  const soundToggle = document.createElement("button");
  soundToggle.className = "sound-toggle";
  soundToggle.innerText = "🔊 Звук ВКЛ";
  soundToggle.onclick = () => toggleSound(soundToggle);

  // Добавляем в header или в начало body
  const header =
    document.querySelector("header") ||
    document.querySelector(".header") ||
    document.body;
  
  // Безопасное добавление элемента
  if (header.firstChild) {
    header.insertBefore(soundToggle, header.firstChild);
  } else {
    header.appendChild(soundToggle);
  }

  // Добавляем кнопки чтения
  addReadButtons();
  
  console.log("Text-to-Speech initialized successfully");
}

// Экспортируем для использования в основном коде
window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
