/**
 * Chitas Modern UI - Единый файл интеграции
 * Заменяет modern-ui.js и ui-adapter.js
 */

// ==========================================
// НАСТРОЙКИ
// ==========================================
const settings = {
  sound: true,
  autoNext: false,
  animations: true,
  darkMode: false
};

let currentTab = 'home';
let currentSectionId = null;

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Chitas Modern UI starting...');
  
  // Загружаем настройки
  const savedSettings = localStorage.getItem('chitasSettings');
  if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
  }
  
  // Подписываемся на изменения авторизации
  if (window.authManager) {
    window.authManager.onAuthStateChanged((user) => {
      console.log('Auth state changed in Modern UI:', user ? user.email : 'No user');
      
      // Обновляем профиль если открыт
      if (currentTab === 'profile') {
        updateProfileInfo();
      }
      
      // Синхронизируем прогресс
      if (user && window.chitasApp && window.progressManager) {
        window.progressManager.syncProgress().then(progress => {
          if (progress) {
            window.chitasApp.loadProgressFromManager();
            updateProgress();
            renderTiles(); // Обновляем плитки с новым прогрессом
          }
        });
      }
    });
  }
  
  // Ждём загрузки ChitasApp
  waitForChitasApp();
});

// ==========================================
// ОЖИДАНИЕ ЗАГРУЗКИ ПРИЛОЖЕНИЯ
// ==========================================
function waitForChitasApp() {
  let attempts = 0;
  const maxAttempts = 100;
  
  const checkApp = setInterval(() => {
    attempts++;
    
    if (window.chitasApp && window.chitasApp.state) {
      clearInterval(checkApp);
      console.log('✅ ChitasApp found!');
      integrateModernUI();
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(checkApp);
      console.error('❌ Timeout waiting for ChitasApp');
    }
  }, 100);
}

// ==========================================
// ИНТЕГРАЦИЯ СОВРЕМЕННОГО UI
// ==========================================
function integrateModernUI() {
  console.log('🔧 Integrating Modern UI...');
  
  // Перехватываем renderSections
  const originalRenderSections = window.chitasApp.renderSections.bind(window.chitasApp);
  
  window.chitasApp.renderSections = function() {
    // Сначала рендерим оригинально (создаём DOM)
    originalRenderSections();
    
    // Потом прячем и показываем плитки
    hideOriginalSectionsShowTiles();
  };
  
  // Ждём загрузки данных
  waitForData();
}

// ==========================================
// ОЖИДАНИЕ ДАННЫХ
// ==========================================
function waitForData() {
  let attempts = 0;
  const maxAttempts = 100;
  
  const checkData = setInterval(() => {
    attempts++;
    
    if (window.chitasApp.state.data) {
      clearInterval(checkData);
      console.log('✅ Data loaded!');
      
      // Обновляем UI
      updateHebrewDate();
      renderTiles();
      
      // Скрываем оригинальные секции
      hideOriginalSections();
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(checkData);
      console.warn('⚠️ Data not loaded yet');
    }
  }, 100);
}

// ==========================================
// ОБНОВЛЕНИЕ ДАТЫ
// ==========================================
function updateHebrewDate() {
  const data = window.chitasApp.state.data;
  if (!data) return;
  
  const hebrewDateEl = document.getElementById('hebrewDate');
  if (hebrewDateEl && data.hebrewDate) {
    hebrewDateEl.textContent = data.hebrewDate;
  }
  
  const dedicationEl = document.getElementById('dedication');
  if (dedicationEl && data.metadata && data.metadata.dedication) {
    dedicationEl.textContent = data.metadata.dedication;
  }
}

// ==========================================
// СКРЫТИЕ ОРИГИНАЛЬНЫХ СЕКЦИЙ
// ==========================================
function hideOriginalSections() {
  const container = document.getElementById('sectionsContainer');
  if (container) {
    container.style.display = 'none';
  }
}

function hideOriginalSectionsShowTiles() {
  hideOriginalSections();
  renderTiles();
}

// ==========================================
// РЕНДЕРИНГ ПЛИТОК
// ==========================================
function renderTiles() {
  const grid = document.getElementById('sectionsGrid');
  if (!grid || !window.chitasApp || !window.chitasApp.state.data) return;
  
  const sections = window.chitasApp.state.data.sections;
  
  grid.innerHTML = sections.map(section => {
    const isCompleted = window.chitasApp.state.completed[section.id];
    const preview = section.content?.paragraphs?.[0]?.text || '';
    const shortPreview = preview.substring(0, 100) + (preview.length > 100 ? '...' : '');
    
    return `
      <div class="section-tile ${isCompleted ? 'completed' : ''}" onclick="openModernSection(${section.id})">
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
  
  console.log('✅ Tiles rendered:', sections.length);
}

// ==========================================
// ОТКРЫТИЕ РАЗДЕЛА
// ==========================================
function openModernSection(sectionId) {
  console.log('📂 Opening section:', sectionId);
  
  currentSectionId = sectionId;
  
  // Находим оригинальный раздел в DOM
  const originalSection = document.getElementById('s' + sectionId);
  if (!originalSection) {
    console.error('Section not found:', sectionId);
    return;
  }
  
  // Открываем оригинальный раздел (чтобы игры инициализировались)
  originalSection.classList.add('active');
  
  // Копируем контент в fullscreen
  const section = window.chitasApp.state.data.sections.find(s => s.id === sectionId);
  
  const titleBar = document.getElementById('sectionTitleBar');
  if (titleBar) {
    titleBar.textContent = section.title;
  }
  
  const contentArea = document.getElementById('sectionContentArea');
  if (contentArea) {
    // Берём контент из оригинального раздела
    const originalContent = originalSection.querySelector('.section-content');
    if (originalContent) {
      contentArea.innerHTML = originalContent.innerHTML;
    }
  }
  
  // Показываем fullscreen
  const fullscreen = document.getElementById('sectionFullscreen');
  if (fullscreen) {
    fullscreen.classList.add('active');
  }
  
  // Скрываем плитки и навигацию
  const grid = document.getElementById('sectionsGrid');
  if (grid) {
    grid.style.display = 'none';
  }
  
  const dateNav = document.querySelector('.date-navigation');
  if (dateNav) {
    dateNav.style.display = 'none';
  }
}

// ==========================================
// ЗАКРЫТИЕ РАЗДЕЛА
// ==========================================
function closeModernSection() {
  console.log('📁 Closing section');
  
  // Закрываем оригинальный раздел
  if (currentSectionId) {
    const originalSection = document.getElementById('s' + currentSectionId);
    if (originalSection) {
      originalSection.classList.remove('active');
    }
  }
  
  // Скрываем fullscreen
  const fullscreen = document.getElementById('sectionFullscreen');
  if (fullscreen) {
    fullscreen.classList.remove('active');
  }
  
  // Показываем плитки и навигацию
  const grid = document.getElementById('sectionsGrid');
  if (grid) {
    grid.style.display = 'grid';
  }
  
  const dateNav = document.querySelector('.date-navigation');
  if (dateNav) {
    dateNav.style.display = 'block';
  }
  
  currentSectionId = null;
  
  // Останавливаем звук
  if (window.stopReading) {
    window.stopReading();
  }
}

// ==========================================
// ПЕРЕКЛЮЧЕНИЕ ТАБОВ
// ==========================================
function switchModernTab(tab) {
  currentTab = tab;
  
  // Обновляем активный пункт меню
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  event.target.closest('.menu-item').classList.add('active');
  
  const sectionsGrid = document.getElementById('sectionsGrid');
  const profileScreen = document.getElementById('profileScreen');
  const dateNav = document.querySelector('.date-navigation');
  
  if (tab === 'home') {
    if (sectionsGrid) sectionsGrid.style.display = 'grid';
    if (profileScreen) profileScreen.style.display = 'none';
    if (dateNav) dateNav.style.display = 'block';
  } else if (tab === 'profile') {
    if (sectionsGrid) sectionsGrid.style.display = 'none';
    if (profileScreen) profileScreen.style.display = 'block';
    if (dateNav) dateNav.style.display = 'none';
    updateProfileInfo();
  }
}

// ==========================================
// ОБНОВЛЕНИЕ ПРОФИЛЯ
// ==========================================
function updateProfileInfo() {
  const accountInfo = document.getElementById('profileAccountInfo');
  if (!accountInfo) return;
  
  if (window.authManager && window.authManager.isSignedIn()) {
    const user = window.authManager.getCurrentUser();
    const userName = window.authManager.getUserName();
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';
    
    accountInfo.innerHTML = `
      <div style="padding: 15px; background: var(--bg-light); border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          <div class="user-avatar" style="width: 60px; height: 60px; font-size: 1.8em; background: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${initial}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 1.2em; color: var(--text-dark);">
              ${userName}
            </div>
            <div style="color: var(--text-light); font-size: 0.9em;">
              ${user.email}
            </div>
          </div>
        </div>
        <button onclick="handleSignOut()" 
                style="width: 100%; padding: 12px; background: #f44336; 
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
        <button onclick="openAuthModal()" 
                style="background: #667eea; color: white; border: none; 
                       padding: 12px 30px; border-radius: 10px; 
                       font-weight: bold; cursor: pointer;">
          Войти
        </button>
      </div>
    `;
  }
  
  // Обновляем прогресс
  updateProgress();
}

// ==========================================
// ОБНОВЛЕНИЕ ПРОГРЕССА
// ==========================================
function updateProgress() {
  if (!window.chitasApp) return;
  
  const state = window.chitasApp.state;
  
  const scoreEl = document.getElementById('score');
  const starsEl = document.getElementById('stars');
  const doneEl = document.getElementById('done');
  const progressEl = document.getElementById('progress');
  
  if (scoreEl) scoreEl.textContent = state.score || 0;
  if (starsEl) starsEl.textContent = state.stars || 0;
  if (doneEl) doneEl.textContent = `${state.done || 0}/${state.data?.sections.length || 5}`;
  
  if (progressEl) {
    const totalSections = state.data?.sections.length || 5;
    const percentage = Math.round(((state.done || 0) / totalSections) * 100);
    progressEl.style.width = percentage + '%';
    progressEl.textContent = percentage + '%';
  }
}

// ==========================================
// НАСТРОЙКИ
// ==========================================
function openModernSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModernSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function toggleModernSetting(settingName) {
  settings[settingName] = !settings[settingName];
  
  const toggle = document.getElementById(settingName + 'Toggle');
  if (toggle) {
    if (settings[settingName]) {
      toggle.classList.add('on');
    } else {
      toggle.classList.remove('on');
    }
  }
  
  localStorage.setItem('chitasSettings', JSON.stringify(settings));
  console.log('Setting changed:', settingName, settings[settingName]);
}

// ==========================================
// НАВИГАЦИЯ ПО ДНЯМ
// ==========================================
function changeModernDay(direction) {
  if (window.chitasApp && window.chitasApp.navigateDay) {
    window.chitasApp.navigateDay(direction);
  }
}

// ==========================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ==========================================
window.openModernSection = openModernSection;
window.closeModernSection = closeModernSection;
window.switchModernTab = switchModernTab;
window.openModernSettings = openModernSettings;
window.closeModernSettings = closeModernSettings;
window.toggleModernSetting = toggleModernSetting;
window.changeModernDay = changeModernDay;

console.log('✅ Chitas Modern UI loaded!');
