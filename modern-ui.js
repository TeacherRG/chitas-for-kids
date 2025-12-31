/**
 * Modern UI Controller for Chitas for Kids
 * Управление современным интерфейсом
 */

// Глобальные настройки
const settings = {
  sound: true,
  autoNext: false,
  animations: true,
  darkMode: false
};

// Текущее состояние
let currentTab = 'home';
let currentSectionId = null;

// === ПЕРЕКЛЮЧЕНИЕ ТАБОВ ===
function switchTab(tab) {
  currentTab = tab;
  
  // Обновляем активный пункт меню
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.menu-item').classList.add('active');
  
  // Показываем нужный экран
  const sectionsGrid = document.getElementById('sectionsGrid');
  const profileScreen = document.getElementById('profileScreen');
  const dateNav = document.querySelector('.date-navigation');
  
  if (tab === 'home') {
    // Главная - показываем разделы
    if (sectionsGrid) sectionsGrid.style.display = 'grid';
    if (profileScreen) profileScreen.style.display = 'none';
    if (dateNav) dateNav.style.display = 'block';
  } else if (tab === 'profile') {
    // Профиль - показываем профиль
    if (sectionsGrid) sectionsGrid.style.display = 'none';
    if (profileScreen) profileScreen.style.display = 'block';
    if (dateNav) dateNav.style.display = 'none';
    
    // Обновляем информацию профиля
    updateProfileInfo();
  }
  
  console.log('Switched to tab:', tab);
}

// === ОБНОВЛЕНИЕ ИНФОРМАЦИИ ПРОФИЛЯ ===
function updateProfileInfo() {
  const accountInfo = document.getElementById('profileAccountInfo');
  
  if (accountInfo) {
    // Проверяем авторизацию
    if (window.firebase && firebase.auth().currentUser) {
      const user = firebase.auth().currentUser;
      accountInfo.innerHTML = `
        <div style="padding: 15px; background: var(--bg-light); border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <div class="user-avatar" style="width: 60px; height: 60px; font-size: 1.8em;">
              ${user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 1.2em; color: var(--text-dark);">
                ${user.displayName || 'Пользователь'}
              </div>
              <div style="color: var(--text-light); font-size: 0.9em;">
                ${user.email}
              </div>
            </div>
          </div>
          <button onclick="firebase.auth().signOut()" 
                  style="width: 100%; padding: 12px; background: var(--danger-color); 
                         color: white; border: none; border-radius: 10px; 
                         font-weight: bold; cursor: pointer;">
            Выйти из аккаунта
          </button>
        </div>
      `;
    } else {
      accountInfo.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p style="color: var(--text-light); margin-bottom: 15px;">
            Войдите в аккаунт, чтобы сохранять прогресс
          </p>
          <button onclick="showAuthModal()" 
                  class="modal-btn primary"
                  style="max-width: 300px; margin: 0 auto;">
            Войти
          </button>
        </div>
      `;
    }
  }
}

// === НАВИГАЦИЯ ПО ДНЯМ ===
function changeDay(direction) {
  if (!window.chitasApp) return;
  
  const currentDate = window.chitasApp.state.currentDate;
  if (!currentDate) return;
  
  const date = new Date(currentDate);
  date.setDate(date.getDate() + direction);
  
  const newDateStr = date.toISOString().split('T')[0];
  
  // Проверяем доступность дня
  const dayInfo = window.chitasApp.state.index?.days.find(d => d.date === newDateStr);
  
  if (dayInfo && dayInfo.available) {
    window.chitasApp.loadData(newDateStr);
    updateDateDisplay(newDateStr);
  }
}

function updateDateDisplay(dateStr) {
  const date = new Date(dateStr);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const formatted = date.toLocaleDateString('ru-RU', options);
  
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    const today = new Date().toISOString().split('T')[0];
    currentDateEl.textContent = dateStr === today ? 'Сегодня' : formatted;
  }
}

// === ОТКРЫТИЕ/ЗАКРЫТИЕ РАЗДЕЛА ===
function openSection(sectionId) {
  currentSectionId = sectionId;
  
  const section = window.chitasApp.state.data?.sections.find(s => s.id === sectionId);
  if (!section) return;
  
  // Заполняем заголовок
  const titleBar = document.getElementById('sectionTitleBar');
  if (titleBar) {
    titleBar.textContent = section.title;
  }
  
  // Заполняем контент
  const contentArea = document.getElementById('sectionContentArea');
  if (contentArea && window.chitasApp && window.chitasApp.renderSectionContent) {
    contentArea.innerHTML = window.chitasApp.renderSectionContent(section);
  }
  
  // Показываем полноэкранный вид
  const fullscreen = document.getElementById('sectionFullscreen');
  if (fullscreen) {
    fullscreen.classList.add('active');
  }
  
  // Скрываем сетку и навигацию
  const grid = document.getElementById('sectionsGrid');
  if (grid) {
    grid.style.display = 'none';
  }
  
  const dateNav = document.querySelector('.date-navigation');
  if (dateNav) {
    dateNav.style.display = 'none';
  }
  
  // Озвучивание ТОЛЬКО если включено в настройках
  if (settings.sound) {
    console.log('Auto-reading enabled, starting...');
    if (window.startReading) {
      setTimeout(() => window.startReading(), 500);
    }
    
    // Обновляем кнопку звука в разделе
    const sectionBtn = document.querySelector('.sound-toggle-section');
    if (sectionBtn) {
      sectionBtn.classList.add('reading');
      sectionBtn.textContent = '🔇';
    }
  }
}

function closeSection() {
  // Скрываем полноэкранный вид
  const fullscreen = document.getElementById('sectionFullscreen');
  if (fullscreen) {
    fullscreen.classList.remove('active');
  }
  
  // Показываем сетку
  const grid = document.getElementById('sectionsGrid');
  if (grid) {
    grid.style.display = 'grid';
  }
  
  // Показываем навигацию по дням
  const dateNav = document.querySelector('.date-navigation');
  if (dateNav) {
    dateNav.style.display = 'block';
  }
  
  currentSectionId = null;
  
  // Останавливаем озвучивание
  if (window.stopReading) {
    window.stopReading();
  }
}

// === НАСТРОЙКИ ===
function openSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function toggleSetting(settingName) {
  settings[settingName] = !settings[settingName];
  
  const toggle = document.getElementById(settingName + 'Toggle');
  if (toggle) {
    if (settings[settingName]) {
      toggle.classList.add('on');
    } else {
      toggle.classList.remove('on');
    }
  }
  
  // Применяем настройки
  applySettings(settingName);
  
  // Сохраняем в localStorage
  localStorage.setItem('chitasSettings', JSON.stringify(settings));
}

function applySettings(settingName) {
  switch(settingName) {
    case 'sound':
      console.log('Sound:', settings.sound ? 'ON' : 'OFF');
      break;
    case 'darkMode':
      if (settings.darkMode) {
        document.body.style.filter = 'invert(0.9) hue-rotate(180deg)';
      } else {
        document.body.style.filter = 'none';
      }
      break;
    case 'animations':
      if (!settings.animations) {
        document.body.style.setProperty('--animation-duration', '0s');
      } else {
        document.body.style.setProperty('--animation-duration', '0.3s');
      }
      break;
  }
}

// === РЕНДЕРИНГ ПЛИТОЧНОГО ВИДА ===
function renderSectionsTiles() {
  const grid = document.getElementById('sectionsGrid');
  if (!grid || !window.chitasApp || !window.chitasApp.state.data) return;
  
  const sections = window.chitasApp.state.data.sections;
  
  grid.innerHTML = sections.map(section => {
    const isCompleted = window.chitasApp.state.completed[section.id];
    const preview = section.content?.paragraphs?.[0]?.text || '';
    const shortPreview = preview.substring(0, 100) + (preview.length > 100 ? '...' : '');
    
    return `
      <div class="section-tile ${isCompleted ? 'completed' : ''}" onclick="openSection(${section.id})">
        <div class="tile-header">
          <div class="tile-icon">${section.icon || '📖'}</div>
          <div class="tile-info">
            <h3>${section.title.replace(/📖|🙏|📘|⚖️|☀️/g, '').trim()}</h3>
            <span class="tile-points">+${section.points} баллов</span>
          </div>
        </div>
        <div class="tile-preview">${shortPreview}</div>
        <div class="tile-action">
          <button class="open-btn">Открыть</button>
          <span class="tile-status">${isCompleted ? '✅ Пройдено' : 'Не пройдено'}</span>
        </div>
      </div>
    `;
  }).join('');
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем сохранённые настройки
  const savedSettings = localStorage.getItem('chitasSettings');
  if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
    
    // Применяем настройки к UI
    Object.keys(settings).forEach(key => {
      const toggle = document.getElementById(key + 'Toggle');
      if (toggle && settings[key]) {
        toggle.classList.add('on');
      }
      applySettings(key);
    });
  }
  
  // Инициализируем кнопку звука
  initSoundButton();
  
  // Закрытие модалов по клику вне них
  document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
      closeSettings();
    }
  });
  
  console.log('Modern UI initialized with settings:', settings);
});

// === ОБНОВЛЕНИЕ ПРОГРЕССА ===
function updateProgress() {
  if (!window.chitasApp) return;
  
  const state = window.chitasApp.state;
  
  // Обновляем счётчики
  const scoreEl = document.getElementById('score');
  const starsEl = document.getElementById('stars');
  const doneEl = document.getElementById('done');
  const progressEl = document.getElementById('progress');
  
  if (scoreEl) scoreEl.textContent = state.score;
  if (starsEl) starsEl.textContent = state.stars;
  if (doneEl) doneEl.textContent = `${state.done}/5`;
  
  if (progressEl) {
    const totalSections = state.data?.sections.length || 5;
    const percentage = Math.round((state.done / totalSections) * 100);
    progressEl.style.width = percentage + '%';
    progressEl.textContent = percentage + '%';
  }
  
  // Обновляем плитки
  renderSectionsTiles();
}

// Экспорт функций
window.switchTab = switchTab;
window.changeDay = changeDay;
window.openSection = openSection;
window.closeSection = closeSection;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleSetting = toggleSetting;
window.renderSectionsTiles = renderSectionsTiles;
window.updateProgress = updateProgress;
window.updateProfileInfo = updateProfileInfo;

// Функция для переключения звука в разделе
window.toggleSectionSound = function() {
  const btn = document.querySelector('.sound-toggle-section');
  
  if (window.responsiveVoice && window.responsiveVoice.isPlaying()) {
    // Останавливаем
    if (window.stopReading) {
      window.stopReading();
    } else {
      window.responsiveVoice.cancel();
    }
    if (btn) {
      btn.classList.remove('reading');
      btn.textContent = '🔊';
    }
  } else {
    // Запускаем
    if (window.startReading) {
      window.startReading();
    }
    if (btn) {
      btn.classList.add('reading');
      btn.textContent = '🔇';
    }
  }
};

// Глобальная функция для переключения звука (для кнопки в шапке)
window.toggleSound = function(button) {
  if (!button) return;
  
  // Переключаем настройку
  settings.sound = !settings.sound;
  
  // Обновляем кнопку
  if (settings.sound) {
    button.textContent = '🔊 Звук ВКЛ';
    button.classList.remove('off');
  } else {
    button.textContent = '🔊 Звук ВЫКЛ';
    button.classList.add('off');
    
    // Останавливаем озвучивание если играет
    if (window.responsiveVoice && window.responsiveVoice.isPlaying()) {
      if (window.stopReading) {
        window.stopReading();
      } else {
        window.responsiveVoice.cancel();
      }
    }
  }
  
  // Сохраняем настройку
  localStorage.setItem('chitasSettings', JSON.stringify(settings));
  
  console.log('Sound setting changed to:', settings.sound);
};

// Инициализация кнопки звука при загрузке
function initSoundButton() {
  const soundBtn = document.querySelector('.sound-toggle');
  if (soundBtn && settings.sound !== undefined) {
    if (settings.sound) {
      soundBtn.textContent = '🔊 Звук ВКЛ';
      soundBtn.classList.remove('off');
    } else {
      soundBtn.textContent = '🔊 Звук ВЫКЛ';
      soundBtn.classList.add('off');
    }
  }
}
