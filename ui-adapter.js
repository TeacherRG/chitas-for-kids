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
    
    // Игры - поддерживаем и массив и объект
    if (section.game) {
      if (Array.isArray(section.game)) {
        // Новый формат - массив игр (меню)
        console.log('Rendering games menu for section', section.id);
        html += '<div id="games-menu-container"></div>';
        
        // После рендеринга HTML инициализируем меню игр
        setTimeout(() => {
          if (window.GamesMenu && typeof window.GamesMenu.init === 'function') {
            window.GamesMenu.init(section.id, section.game, window.chitasApp);
          } else {
            console.error('GamesMenu not available');
          }
        }, 100);
      } else {
        // Старый формат - одна игра
        console.log('Rendering single game for section', section.id);
        if (this.renderGame) {
          html += this.renderGame(section.game, section.id);
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
  
  // Рендерим плитки
  if (window.renderSectionsTiles) {
    window.renderSectionsTiles();
  }
  
  // Обновляем прогресс
  if (window.updateProgress) {
    window.updateProgress();
  }
  
  // Обновляем дату
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
