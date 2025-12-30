/**
 * Chitas for Kids - Main Application
 * Универсальный движок для интерактивного изучения Читаса
 */

class ChitasApp {
  constructor() {
    this.state = {
      index: null,
      data: null,
      currentDate: null,
      score: 0,
      stars: 0,
      done: 0,
      completed: {},
      completedDays: {}
    };
    this.gameStates = {};
  }

  /**
   * Загрузка индекса доступных дней
   */
  async loadIndex() {
    try {
      const response = await fetch('data/index.json');
      if (!response.ok) throw new Error('Index not found');
      this.state.index = await response.json();
      console.log('✅ Index loaded:', this.state.index);
    } catch (error) {
      console.error('❌ Error loading index:', error);
      this.state.index = { days: [] };
    }
  }

  /**
   * Загрузка данных для конкретного дня
   */
  async loadData(date) {
    try {
      // Проверяем доступность дня в индексе
      const dayInfo = this.state.index.days.find(d => d.date === date);
      if (!dayInfo || !dayInfo.available) {
        this.showUnavailable(date);
        return;
      }

      const response = await fetch(`data/${date}.json`);
      if (!response.ok) throw new Error('Data not found');
      
      this.state.data = await response.json();
      this.state.currentDate = date;
      
      // Обновляем URL без перезагрузки
      const url = new URL(window.location);
      url.searchParams.set('date', date);
      window.history.pushState({}, '', url);
      
      this.resetGameState();
      this.renderAll();
      
      // Загружаем прогресс для этого дня
      await this.loadProgressForCurrentDay();
      
      console.log('✅ Data loaded for:', date);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      this.showUnavailable(date);
    }
  }

  /**
   * Загрузка прогресса для текущего дня
   */
  async loadProgressForCurrentDay() {
    if (window.progressManager) {
      const progress = await window.progressManager.loadProgress();
      if (progress && progress.completedDays) {
        const dayKey = this.state.currentDate;
        if (progress.completedDays[dayKey]) {
          this.state.completed = progress.completedDays[dayKey];
          this.state.done = Object.keys(this.state.completed).length;
          
          // Обновляем общие баллы и звёзды
          this.state.score = progress.score || 0;
          this.state.stars = progress.stars || 0;
          this.state.completedDays = progress.completedDays || {};
          
          this.renderScoreboard();
          
          // Отмечаем завершённые разделы
          Object.keys(this.state.completed).forEach(sectionId => {
            const sectionEl = document.getElementById(`s${sectionId}`);
            if (sectionEl) {
              sectionEl.classList.add('completed');
            }
          });
        }
      }
    }
  }

  /**
   * Показать сообщение о недоступном дне
   */
  showUnavailable(date) {
    const container = document.getElementById('unavailableMessage');
    container.innerHTML = `
      <div class="unavailable-message">
        <h2>📅 День недоступен</h2>
        <p>Материалы для ${date} ещё не готовы.</p>
        <button class="btn" onclick="window.chitasApp.goToLatestDay()">
          Перейти к последнему доступному дню
        </button>
      </div>
    `;
    document.getElementById('sectionsContainer').innerHTML = '';
  }

  /**
   * Перейти к последнему доступному дню
   */
  goToLatestDay() {
    const availableDays = this.state.index.days.filter(d => d.available);
    if (availableDays.length > 0) {
      const latestDay = availableDays[availableDays.length - 1];
      this.loadData(latestDay.date);
    }
  }

  /**
   * Перейти к сегодняшнему дню
   */
  goToToday() {
    const today = new Date().toISOString().split('T')[0];
    const dayInfo = this.state.index.days.find(d => d.date === today);
    
    if (dayInfo && dayInfo.available) {
      this.loadData(today);
    } else {
      this.goToLatestDay();
    }
  }

  /**
   * Навигация по дням (offset: -1 для предыдущего, +1 для следующего)
   */
  async navigateDay(offset) {
    const availableDays = this.state.index.days.filter(d => d.available);
    const currentIndex = availableDays.findIndex(d => d.date === this.state.currentDate);
    
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + offset;
    if (newIndex >= 0 && newIndex < availableDays.length) {
      await this.loadData(availableDays[newIndex].date);
    }
  }

  /**
   * Проверка доступности кнопок навигации
   */
  async checkNavigationAvailability() {
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    
    const availableDays = this.state.index.days.filter(d => d.available);
    const currentIndex = availableDays.findIndex(d => d.date === this.state.currentDate);
    
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= availableDays.length - 1;
  }

  /**
   * Рендер всего контента
   */
  renderAll() {
    this.renderHeader();
    this.renderNavigation();
    this.renderScoreboard();
    this.renderSections();
    this.checkNavigationAvailability();
  }

  /**
   * Рендер заголовка
   */
  renderHeader() {
    document.getElementById('pageTitle').textContent = 
      `📖 ${this.state.data.metadata.parsha || 'Chitas for Kids'}`;
    document.getElementById('hebrewDate').textContent = 
      this.state.data.metadata.hebrewDate || '';
    document.getElementById('dedication').textContent = 
      this.state.data.metadata.dedication || '';
  }

  /**
   * Рендер навигации
   */
  renderNavigation() {
    const nav = document.getElementById('navigation');
    nav.innerHTML = `
      <button id="prevDay" class="nav-btn" disabled>◀ Предыдущий день</button>
      <button id="todayBtn" class="nav-btn today-btn">📅 Сегодня</button>
      <button id="printBtn" class="nav-btn print-btn">🖨️ Печать</button>
      <button id="nextDay" class="nav-btn" disabled>Следующий день ▶</button>
    `;
    
    document.getElementById('prevDay').onclick = () => this.navigateDay(-1);
    document.getElementById('nextDay').onclick = () => this.navigateDay(1);
    document.getElementById('todayBtn').onclick = () => this.goToToday();
    document.getElementById('printBtn').onclick = () => this.handlePrint();
  }

  /**
   * Обработка печати - открывает все разделы
   */
  handlePrint() {
    // Сохраняем текущее состояние открытых разделов
    const openSections = [];
    this.state.data.sections.forEach(section => {
      const sectionEl = document.getElementById(`s${section.id}`);
      if (sectionEl && sectionEl.classList.contains('active')) {
        openSections.push(section.id);
      }
    });

    // Открываем все разделы для печати
    this.state.data.sections.forEach(section => {
      const sectionEl = document.getElementById(`s${section.id}`);
      if (sectionEl) {
        sectionEl.classList.add('active');
      }
    });

    // Печатаем
    window.print();

    // Восстанавливаем предыдущее состояние после печати
    setTimeout(() => {
      this.state.data.sections.forEach(section => {
        const sectionEl = document.getElementById(`s${section.id}`);
        if (sectionEl && !openSections.includes(section.id)) {
          sectionEl.classList.remove('active');
        }
      });
    }, 100);
  }

  /**
   * Рендер счётной доски
   */
  renderScoreboard() {
    document.getElementById('score').textContent = this.state.score;
    document.getElementById('stars').textContent = this.state.stars;
    document.getElementById('done').textContent = 
      `${this.state.done}/${this.state.data.sections.length}`;
    
    const progress = (this.state.done / this.state.data.sections.length) * 100;
    const progressBar = document.getElementById('progress');
    progressBar.style.width = progress + '%';
    progressBar.textContent = Math.round(progress) + '%';
    
    if (this.state.done === this.state.data.sections.length) {
      document.getElementById('final').classList.add('show');
      document.getElementById('finalScore').textContent = this.state.score + ' баллов!';
    }
  }

  /**
   * Рендер секций
   */
  renderSections() {
    const container = document.getElementById('sectionsContainer');
    container.innerHTML = this.state.data.sections.map(section => `
      <div class="section ${this.state.completed[section.id] ? 'completed' : ''}" id="s${section.id}">
        <div class="section-header" onclick="window.chitasApp.toggleSection(${section.id})">
          <div class="section-title">${section.title}</div>
          <div class="section-badge">${section.points} баллов</div>
        </div>
        <div class="section-content">
          ${this.renderContent(section.content)}
          ${this.renderGame(section.game, section.id)}
        </div>
      </div>
    `).join('');
  }

  /**
   * Рендер контента секции
   */
  renderContent(content) {
    let html = '<div class="story-text">';
    
    content.paragraphs.forEach(para => {
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
    
    if (content.funFact) {
      html += `<div class="fun-fact">${content.funFact}</div>`;
    }
    
    return html;
  }

  /**
   * Обработка подсветки текста
   */
  processHighlights(text) {
    return text; // HTML уже в тексте
  }

  /**
   * Рендер игры
   */
  renderGame(game, sectionId) {
    if (!game) return '';
    
    switch (game.type) {
      case 'quiz':
        return this.createQuizGame(game, sectionId);
      case 'match':
        return this.createMatchGame(game, sectionId);
      case 'memory':
        return this.createMemoryGame(game, sectionId);
      default:
        return '';
    }
  }

  /**
   * Создание викторины
   */
  createQuizGame(game, sectionId) {
    const optionsHtml = game.options.map((opt, idx) => 
      `<div class="quiz-option" data-section="${sectionId}" data-correct="${opt.correct}" data-index="${idx}">
        ${opt.text}
      </div>`
    ).join('');
    
    setTimeout(() => {
      document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(option => {
        option.onclick = () => this.handleQuizAnswer(option, game, sectionId);
      });
    }, 100);
    
    return `
      <div class="game-container">
        <h3>🎮 ${game.title || 'Викторина'}</h3>
        <div class="quiz-question">${game.question}</div>
        <div id="q${sectionId}">${optionsHtml}</div>
        <div id="f${sectionId}"></div>
      </div>
    `;
  }

  /**
   * Обработка ответа на викторину
   */
  handleQuizAnswer(option, game, sectionId) {
    if (option.classList.contains('correct') || option.classList.contains('wrong')) return;
    
    const allOptions = document.querySelectorAll(`[data-section="${sectionId}"]`);
    allOptions.forEach(opt => opt.style.pointerEvents = 'none');
    
    const isCorrect = option.dataset.correct === 'true';
    const feedback = document.getElementById(`f${sectionId}`);
    
    if (isCorrect) {
      option.classList.add('correct');
      feedback.innerHTML = `<div class="feedback success">${game.successMessage}</div>`;
      this.addScore(this.state.data.sections.find(s => s.id === sectionId).points, sectionId);
    } else {
      option.classList.add('wrong');
      allOptions.forEach(opt => {
        if (opt.dataset.correct === 'true') opt.classList.add('correct');
      });
      feedback.innerHTML = `<div class="feedback error">${game.errorMessage}</div>`;
    }
  }

  /**
   * Создание игры на соответствие
   */
  createMatchGame(game, sectionId) {
    const pairs = game.pairs;
    const keys = Object.keys(pairs);
    const values = Object.values(pairs).sort(() => Math.random() - 0.5);
    
    const leftHtml = keys.map(key => 
      `<div class="match-item" data-key="${key}">${key}</div>`
    ).join('');
    
    const rightHtml = values.map(value => 
      `<div class="match-item" data-value="${value}">${value}</div>`
    ).join('');
    
    setTimeout(() => this.initMatchGame(sectionId, pairs, keys.length), 100);
    
    return `
      <div class="game-container">
        <h3>🎯 ${game.title}</h3>
        <div class="match-game">
          <div class="match-column">
            <h4>Слова на иврите</h4>
            <div id="left${sectionId}">${leftHtml}</div>
          </div>
          <div class="match-column">
            <h4>Русский перевод</h4>
            <div id="right${sectionId}">${rightHtml}</div>
          </div>
        </div>
        <div id="f${sectionId}"></div>
      </div>
    `;
  }

  /**
   * Инициализация игры на соответствие
   */
  initMatchGame(sectionId, pairs, totalPairs) {
    this.gameStates[`match${sectionId}`] = { selected1: null, selected2: null, matchedCount: 0 };
    
    document.querySelectorAll(`#left${sectionId} .match-item`).forEach(item => {
      item.onclick = () => this.handleMatchSelect(item, 'left', sectionId, pairs, totalPairs);
    });
    
    document.querySelectorAll(`#right${sectionId} .match-item`).forEach(item => {
      item.onclick = () => this.handleMatchSelect(item, 'right', sectionId, pairs, totalPairs);
    });
  }

  /**
   * Обработка выбора в игре на соответствие
   */
  handleMatchSelect(item, side, sectionId, pairs, totalPairs) {
    if (item.classList.contains('matched')) return;
    
    const state = this.gameStates[`match${sectionId}`];
    const key = side === 'left' ? 'selected1' : 'selected2';
    
    if (state[key]) state[key].classList.remove('selected');
    state[key] = item;
    item.classList.add('selected');
    
    if (state.selected1 && state.selected2) {
      const key1 = state.selected1.dataset.key;
      const value2 = state.selected2.dataset.value;
      
      if (pairs[key1] === value2) {
        state.selected1.classList.add('matched');
        state.selected2.classList.add('matched');
        state.matchedCount++;
        
        if (state.matchedCount === totalPairs) {
          const game = this.state.data.sections.find(s => s.id === sectionId).game;
          document.getElementById(`f${sectionId}`).innerHTML = 
            `<div class="feedback success">${game.successMessage}</div>`;
          this.addScore(this.state.data.sections.find(s => s.id === sectionId).points, sectionId);
        }
      } else {
        const game = this.state.data.sections.find(s => s.id === sectionId).game;
        document.getElementById(`f${sectionId}`).innerHTML = 
          `<div class="feedback error">${game.errorMessage}</div>`;
        
        setTimeout(() => {
          state.selected1.classList.remove('selected');
          state.selected2.classList.remove('selected');
          document.getElementById(`f${sectionId}`).innerHTML = '';
        }, 1500);
      }
      
      state.selected1 = null;
      state.selected2 = null;
    }
  }

  /**
   * Создание игры на память
   */
  createMemoryGame(game, sectionId) {
    const cards = [...game.cards, ...game.cards].sort(() => Math.random() - 0.5);
    
    const cardsHtml = cards.map((card, idx) => 
      `<div class="memory-card" data-card="${card}" data-index="${idx}">❓</div>`
    ).join('');
    
    setTimeout(() => this.initMemoryGame(sectionId, cards.length), 100);
    
    return `
      <div class="game-container">
        <h3>🎲 ${game.title}</h3>
        <p style="margin-bottom: 15px; color: #666;">${game.description || 'Нажимай на карточки, чтобы найти одинаковые пары!'}</p>
        <div class="memory-grid" id="mem${sectionId}">${cardsHtml}</div>
        <div id="f${sectionId}"></div>
      </div>
    `;
  }

  /**
   * Инициализация игры на память
   */
  initMemoryGame(sectionId, totalCards) {
    this.gameStates[`memory${sectionId}`] = { flipped: [], matched: [] };
    
    document.querySelectorAll(`#mem${sectionId} .memory-card`).forEach(card => {
      card.onclick = () => this.handleMemoryClick(card, sectionId, totalCards);
    });
  }

  /**
   * Обработка клика в игре на память
   */
  handleMemoryClick(card, sectionId, totalCards) {
    const state = this.gameStates[`memory${sectionId}`];
    const index = parseInt(card.dataset.index);
    
    if (state.flipped.length >= 2 || card.classList.contains('flipped') || 
        state.matched.includes(index)) return;
    
    card.classList.add('flipped');
    card.textContent = card.dataset.card;
    state.flipped.push(index);
    
    if (state.flipped.length === 2) {
      setTimeout(() => {
        const idx1 = state.flipped[0];
        const idx2 = state.flipped[1];
        const card1 = document.querySelector(`#mem${sectionId} [data-index="${idx1}"]`);
        const card2 = document.querySelector(`#mem${sectionId} [data-index="${idx2}"]`);
        
        if (card1.dataset.card === card2.dataset.card) {
          state.matched.push(idx1, idx2);
          card1.classList.add('matched');
          card2.classList.add('matched');
          
          if (state.matched.length === totalCards) {
            const game = this.state.data.sections.find(s => s.id === sectionId).game;
            document.getElementById(`f${sectionId}`).innerHTML = 
              `<div class="feedback success">${game.successMessage}</div>`;
            this.addScore(this.state.data.sections.find(s => s.id === sectionId).points, sectionId);
          }
        } else {
          card1.classList.remove('flipped');
          card2.classList.remove('flipped');
          card1.textContent = '❓';
          card2.textContent = '❓';
        }
        
        state.flipped = [];
      }, 800);
    }
  }

  /**
   * Переключение видимости секции
   */
  toggleSection(sectionId) {
    document.getElementById(`s${sectionId}`).classList.toggle('active');
  }

  /**
   * Добавление баллов
   */
  addScore(points, sectionId) {
    if (!this.state.completed[sectionId]) {
      this.state.score += points;
      this.state.stars += Math.floor(points / 10);
      this.state.done++;
      this.state.completed[sectionId] = true;
      
      // Сохраняем завершённость дня
      if (!this.state.completedDays) {
        this.state.completedDays = {};
      }
      const dayKey = this.state.currentDate;
      this.state.completedDays[dayKey] = { ...this.state.completed };
      
      document.getElementById(`s${sectionId}`).classList.add('completed');
      this.renderScoreboard();
      
      // Сохраняем прогресс
      this.saveProgress();
    }
  }

  /**
   * Сохранение прогресса
   */
  async saveProgress() {
    if (window.progressManager) {
      const progressData = {
        score: this.state.score,
        stars: this.state.stars,
        done: this.state.done,
        completed: this.state.completed,
        currentDate: this.state.currentDate,
        completedDays: this.state.completedDays || {}
      };
      
      await window.progressManager.saveProgress(progressData);
    }
  }

  /**
   * Загрузка прогресса из ProgressManager
   */
  async loadProgressFromManager() {
    if (window.progressManager) {
      const progress = await window.progressManager.loadProgress();
      if (progress) {
        this.state.score = progress.score || 0;
        this.state.stars = progress.stars || 0;
        this.state.completedDays = progress.completedDays || {};
        
        // Восстанавливаем состояние для текущего дня
        const dayKey = this.state.currentDate;
        if (this.state.completedDays[dayKey]) {
          this.state.completed = this.state.completedDays[dayKey];
          this.state.done = Object.keys(this.state.completed).length;
        }
        
        this.renderScoreboard();
        
        // Отмечаем завершённые разделы
        Object.keys(this.state.completed).forEach(sectionId => {
          const sectionEl = document.getElementById(`s${sectionId}`);
          if (sectionEl) {
            sectionEl.classList.add('completed');
          }
        });
      }
    }
  }

  /**
   * Сброс состояния игры
   */
  resetGameState() {
    this.state.done = 0;
    this.state.completed = {};
    this.gameStates = {};
  }

  /**
   * Инициализация приложения
   */
  async init() {
    // Загружаем индекс всех доступных дней
    await this.loadIndex();
    
    // Загружаем прогресс
    await this.loadProgressFromManager();
    
    // Получаем дату из URL или используем последнюю доступную
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    if (dateParam) {
      this.state.currentDate = dateParam;
    } else {
      // Берем последний доступный день из индекса
      const availableDays = this.state.index.days.filter(d => d.available);
      this.state.currentDate = availableDays.length > 0 
        ? availableDays[availableDays.length - 1].date 
        : new Date().toISOString().split('T')[0];
    }
    
    await this.loadData(this.state.currentDate);
  }
}

// Инициализация при загрузке страницы
window.chitasApp = new ChitasApp();
document.addEventListener('DOMContentLoaded', () => {
  window.chitasApp.init();
});

