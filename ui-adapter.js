/**
 * UI Adapter - Интеграция современного UI с ChitasApp
 */

console.log('UI Adapter: Starting...');

// Функция интеграции
function integrateUI() {
  if (!window.chitasApp || !window.chitasApp.state) {
    console.log('UI Adapter: ChitasApp not ready yet');
    return false;
  }
  
  console.log('UI Adapter: ChitasApp found, integrating...');
  console.log('Available methods:', {
    renderSections: typeof window.chitasApp.renderSections,
    renderGame: typeof window.chitasApp.renderGame,
    renderGames: typeof window.chitasApp.renderGames,
    addScore: typeof window.chitasApp.addScore,
    processHighlights: typeof window.chitasApp.processHighlights
  });
  
  // Сохраняем оригинальный метод renderSections
  const originalRender = window.chitasApp.renderSections.bind(window.chitasApp);
  
  // Переопределяем renderSections
  window.chitasApp.renderSections = function() {
    // Если современный UI активен
    if (document.getElementById('sectionsGrid')) {
      console.log('Rendering sections as tiles');
      if (window.renderSectionsTiles) {
        window.renderSectionsTiles();
      }
      if (window.updateProgress) {
        window.updateProgress();
      }
    } else {
      // Иначе используем оригинальный рендеринг
      originalRender();
    }
  };
  
  // Добавляем метод для рендеринга контента раздела
  window.chitasApp.renderSectionContent = function(section) {
    let html = '';
    
    // Контент
    if (section.content) {
      html += '<div class="story-text">';
      if (section.content.paragraphs) {
        section.content.paragraphs.forEach(para => {
          switch (para.type) {
            case 'heading':
              html += `<p><strong>${this.processHighlights ? this.processHighlights(para.text) : para.text}</strong></p>`;
              break;
            case 'text':
              html += `<p>${this.processHighlights ? this.processHighlights(para.text) : para.text}</p>`;
              break;
            case 'list':
              html += `<p>${this.processHighlights ? this.processHighlights(para.text) : para.text}</p>`;
              break;
          }
        });
      }
      html += '</div>';
      
      if (section.content.funFact) {
        html += `<div class="fun-fact">💡 ${section.content.funFact}</div>`;
      }
    }
    
    // Игры - ВАЖНО: используем правильный контейнер и инициализацию
    if (section.game) {
      const gameCount = Array.isArray(section.game) ? section.game.length : 1;
      console.log('Section has game(s):', gameCount);
      
      if (Array.isArray(section.game) && section.game.length > 1) {
        // Множественные игры - рендерим меню
        console.log('Rendering games menu container');
        html += '<div id="games-menu-container"></div>';
        
        // Инициализируем меню после вставки HTML
        setTimeout(() => {
          console.log('Initializing games menu...');
          console.log('GamesMenu available?', typeof window.GamesMenu);
          
          if (window.GamesMenu && typeof window.GamesMenu.init === 'function') {
            try {
              window.GamesMenu.init(section.id, section.game, window.chitasApp);
              console.log('Games menu initialized successfully');
            } catch (e) {
              console.error('Error initializing games menu:', e);
            }
          } else if (window.initGamesMenu && typeof window.initGamesMenu === 'function') {
            // Альтернативный метод
            try {
              window.initGamesMenu(section.id, section.game);
              console.log('Games menu initialized via initGamesMenu');
            } catch (e) {
              console.error('Error with initGamesMenu:', e);
            }
          } else {
            console.error('No games menu initializer available');
            console.log('window.GamesMenu:', window.GamesMenu);
            console.log('window.initGamesMenu:', window.initGamesMenu);
          }
        }, 200);
      } else {
        // Одна игра - рендерим напрямую
        const game = Array.isArray(section.game) ? section.game[0] : section.game;
        console.log('Rendering single game');
        
        if (this.renderGame && typeof this.renderGame === 'function') {
          html += this.renderGame(game, section.id);
        } else {
          console.error('renderGame method not available');
        }
      }
    }
    
    return html;
  };
  
  // Сохраняем оригинальный addScore
  if (window.chitasApp.addScore) {
    const originalAddScore = window.chitasApp.addScore.bind(window.chitasApp);
    
    // Переопределяем addScore для обновления UI
    window.chitasApp.addScore = function(points, sectionId) {
      originalAddScore(points, sectionId);
      
      // Обновляем современный UI
      if (window.updateProgress) {
        window.updateProgress();
      }
    };
  }
  
  console.log('UI Adapter: Integration complete');
  return true;
}

// Функция для рендеринга после загрузки данных
function renderAfterDataLoad() {
  if (!window.chitasApp || !window.chitasApp.state.data) {
    console.log('UI Adapter: Data not loaded yet');
    return false;
  }
  
  console.log('UI Adapter: Data loaded, rendering...');
  console.log('Current date:', window.chitasApp.state.currentDate);
  console.log('Hebrew date:', window.chitasApp.state.data.hebrewDate);
  
  // Обновляем еврейскую дату
  const hebrewDateEl = document.getElementById('hebrewDate');
  if (hebrewDateEl && window.chitasApp.state.data.hebrewDate) {
    hebrewDateEl.textContent = window.chitasApp.state.data.hebrewDate;
  }
  
  // Обновляем посвящение
  const dedicationEl = document.getElementById('dedication');
  if (dedicationEl && window.chitasApp.state.data.dedication) {
    dedicationEl.textContent = window.chitasApp.state.data.dedication;
  }
  
  // Рендерим плитки
  if (window.renderSectionsTiles) {
    window.renderSectionsTiles();
  }
  
  // Обновляем прогресс
  if (window.updateProgress) {
    window.updateProgress();
  }
  
  // Обновляем отображение текущей даты
  if (window.chitasApp.state.currentDate && window.updateDateDisplay) {
    window.updateDateDisplay(window.chitasApp.state.currentDate);
  }
  
  return true;
}

// Интеграция после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('UI Adapter: DOM loaded, waiting for ChitasApp...');
  
  let attempts = 0;
  const maxAttempts = 100; // 10 секунд
  
  // Ждём инициализации ChitasApp
  const checkApp = setInterval(() => {
    attempts++;
    
    if (integrateUI()) {
      clearInterval(checkApp);
      
      // Теперь ждём загрузки данных
      let dataAttempts = 0;
      const checkData = setInterval(() => {
        dataAttempts++;
        
        if (renderAfterDataLoad()) {
          clearInterval(checkData);
        }
        
        if (dataAttempts >= maxAttempts) {
          clearInterval(checkData);
          console.warn('UI Adapter: Timeout waiting for data');
        }
      }, 100);
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(checkApp);
      console.error('UI Adapter: Timeout waiting for ChitasApp');
      console.log('Available:', {
        chitasApp: !!window.chitasApp,
        ChitasApp: !!window.ChitasApp,
        renderSectionsTiles: !!window.renderSectionsTiles,
        updateProgress: !!window.updateProgress
      });
    }
  }, 100);
});

console.log('UI Adapter loaded');
