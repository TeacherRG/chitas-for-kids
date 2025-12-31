/**
 * UI Adapter - Интеграция современного UI с ChitasApp
 */

// Интеграция после загрузки данных
document.addEventListener('DOMContentLoaded', () => {
  // Ждём инициализации ChitasApp
  const checkApp = setInterval(() => {
    if (window.chitasApp && window.ChitasApp) {
      clearInterval(checkApp);
      
      console.log('UI Adapter: ChitasApp found, integrating...');
      
      // Сохраняем оригинальный метод renderSections
      const originalRender = window.chitasApp.renderSections.bind(window.chitasApp);
      
      // Переопределяем renderSections
      window.chitasApp.renderSections = function() {
        // Если современный UI активен
        if (document.getElementById('sectionsGrid')) {
          console.log('Rendering sections as tiles');
          window.renderSectionsTiles();
          window.updateProgress();
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
          section.content.paragraphs.forEach(para => {
            switch (para.type) {
              case 'heading':
                html += `<p><strong>${this.processHighlights(para.text)}</strong></p>`;
                break;
              case 'text':
                html += `<p>${this.processHighlights(para.text)}</p>`;
                break;
              case 'list':
                html += `<p>${this.processHighlights(para.text)}</p>`;
                break;
            }
          });
          html += '</div>';
          
          if (section.content.funFact) {
            html += `<div class="fun-fact">💡 ${section.content.funFact}</div>`;
          }
        }
        
        // Игры
        if (section.game) {
          html += this.renderGame(section.game, section.id);
        }
        
        return html;
      };
      
      // Сохраняем оригинальный addScore
      const originalAddScore = window.chitasApp.addScore.bind(window.chitasApp);
      
      // Переопределяем addScore для обновления UI
      window.chitasApp.addScore = function(points, sectionId) {
        originalAddScore(points, sectionId);
        
        // Обновляем современный UI
        if (window.updateProgress) {
          window.updateProgress();
        }
      };
      
      console.log('UI Adapter: Integration complete');
      
      // Ждём загрузки данных
      const checkData = setInterval(() => {
        if (window.chitasApp.state.data) {
          clearInterval(checkData);
          
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
        }
      }, 100);
      
      // Таймаут для checkData
      setTimeout(() => clearInterval(checkData), 10000);
    }
  }, 100);
  
  // Таймаут на случай если ChitasApp не загрузится
  setTimeout(() => {
    clearInterval(checkApp);
    console.error('UI Adapter: Timeout waiting for ChitasApp');
  }, 10000);
});

console.log('UI Adapter loaded');
