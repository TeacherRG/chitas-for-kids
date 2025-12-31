/**
 * UI Adapter - Интеграция современного UI с ChitasApp
 */

// Переопределяем метод рендеринга для плиточного вида
if (window.chitasApp && window.ChitasApp) {
  const originalRender = window.ChitasApp.prototype.renderSections;
  
  window.ChitasApp.prototype.renderSections = function() {
    // Если современный UI активен
    if (document.getElementById('sectionsGrid')) {
      window.renderSectionsTiles();
      window.updateProgress();
    } else {
      // Иначе используем оригинальный рендеринг
      originalRender.call(this);
    }
  };
  
  // Добавляем метод для рендеринга контента раздела
  window.ChitasApp.prototype.renderSectionContent = function(section) {
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
  
  // Перехватываем добавление баллов для обновления UI
  const originalAddScore = window.ChitasApp.prototype.addScore;
  
  window.ChitasApp.prototype.addScore = function(points, sectionId) {
    originalAddScore.call(this, points, sectionId);
    
    // Обновляем современный UI
    if (window.updateProgress) {
      window.updateProgress();
    }
  };
}

// Интеграция после загрузки данных
document.addEventListener('DOMContentLoaded', () => {
  // Ждём инициализации ChitasApp
  const checkApp = setInterval(() => {
    if (window.chitasApp && window.chitasApp.state.data) {
      clearInterval(checkApp);
      
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
  
  // Таймаут на случай если данные не загрузятся
  setTimeout(() => clearInterval(checkApp), 10000);
});

console.log('UI Adapter loaded');
