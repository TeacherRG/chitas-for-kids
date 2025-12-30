/* ===============================
   🔊 TEXT TO SPEECH + HIGHLIGHT
   Исправленная версия для Chitas for Kids
   =============================== */

let currentUtterance = null;
let isPaused = false;
let soundEnabled = true;

/* ---------- SWITCH ---------- */
function toggleSound(btn) {
  soundEnabled = !soundEnabled;
  btn.innerText = soundEnabled ? "🔊 Звук ВКЛ" : "🔇 Звук ВЫКЛ";

  if (!soundEnabled) {
    speechSynthesis.cancel();
    clearHighlights();
  }
}

/* ---------- SPEAK ---------- */
function speakText(text, block, button) {
  if (!soundEnabled || !text) return;

  // пауза / продолжить
  if (speechSynthesis.speaking && currentUtterance) {
    if (isPaused) {
      speechSynthesis.resume();
      isPaused = false;
      button.innerText = "⏸ Пауза";
    } else {
      speechSynthesis.pause();
      isPaused = true;
      button.innerText = "▶ Продолжить";
    }
    return;
  }

  speechSynthesis.cancel();
  clearHighlights();

  const utter = new SpeechSynthesisUtterance(text);
  currentUtterance = utter;

  utter.lang = "ru-RU";
  utter.rate = 0.85;
  utter.pitch = 1.15;

  const words = text.split(" ");
  let index = 0;

  utter.onboundary = (e) => {
    if (e.name === "word") {
      highlightWord(block, words, index);
      index++;
    }
  };

  utter.onstart = () => {
    button.innerText = "⏸ Пауза";
    isPaused = false;
  };

  utter.onend = () => {
    button.innerText = "🔊 Прочитай";
    clearHighlights();
    currentUtterance = null;
  };

  utter.onerror = () => {
    button.innerText = "🔊 Прочитай";
    clearHighlights();
    currentUtterance = null;
  };

  speechSynthesis.speak(utter);
}

/* ---------- HIGHLIGHT ---------- */
function highlightWord(block, words, activeIndex) {
  const ttsTextElement = block.querySelector(".tts-text");
  if (!ttsTextElement) return;

  const html = words
    .map((w, i) =>
      i === activeIndex
        ? <span class="tts-highlight">${w}</span>
        : w
    )
    .join(" ");

  ttsTextElement.innerHTML = html;
}

function clearHighlights() {
  document.querySelectorAll(".tts-text").forEach(el => {
    el.innerHTML = el.textContent;
  });
}

/* ---------- BUTTONS ---------- */
function addReadButtons() {
  // Ищем параграфы и секции с текстом
  document.querySelectorAll(".story-paragraph, .section-content, .content-block").forEach(block => {
    // Пропускаем, если кнопка уже есть
    if (block.querySelector(".read-btn")) return;

    // Получаем весь текст блока
    const text = block.textContent.trim();
    
    if (text.length < 10) return;

    // Создаем обертку для текста
    const wrapper = document.createElement("span");
    wrapper.className = "tts-text";
    wrapper.textContent = text;
    
    // Сохраняем оригинальный HTML
    const originalHTML = block.innerHTML;
    block.setAttribute('data-original-html', originalHTML);

    // Создаем кнопку
    const btn = document.createElement("button");
    btn.className = "read-btn";
    btn.innerHTML = "🔊 Прочитай";
    btn.onclick = () => speakText(text, block, btn);

    // Добавляем кнопку перед контентом
    block.insertBefore(btn, block.firstChild);
  });
}

/* ---------- INIT ---------- */
function initTextToSpeech() {
  // Добавляем кнопку переключения звука
  const soundToggle = document.createElement("button");
  soundToggle.className = "sound-toggle";
  soundToggle.innerHTML = "🔊 Звук ВКЛ";
  soundToggle.onclick = () => toggleSound(soundToggle);
  
  // Добавляем в header или в начало body
  const header = document.querySelector("header")  document.querySelector(".header")  document.body;
  header.insertBefore(soundToggle, header.firstChild);

  // Добавляем кнопки чтения
  addReadButtons();
}

// Экспортируем для использования в основном коде
window.initTextToSpeech = initTextToSpeech;
window.addReadButtons = addReadButtons;
