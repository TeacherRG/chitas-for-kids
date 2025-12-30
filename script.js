/**
 * Chitas for Kids - Universal Engine with Index Support
 * Динамическая загрузка и рендеринг контента из JSON
 */

class ChitasApp {
  constructor() {
    this.state = {
      score: 0,
      stars: 0,
      done: 0,
      completed: {},
      currentDate: null,
      data: null,
      index: null
    };
    
    this.gameStates = {};
    this.init();
  }

  /**
   * Инициализация приложения
   */
  async init() {
    // Загружаем индекс всех доступных дней
    await this.loadIndex();
    
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

  /**
   * Загрузка индексного файла
   */
  async loadIndex() {
    try {
      const response = await fetch('data/index.json');
      if (!response.ok) throw new Error('Index file not found');
      
      this.state.index = await response.json();
      console.log(`Loaded index with ${this.state.index.days.length} days`);
    } catch (error) {
      console.error('Error loading index:', error);
      this.showError('Не удалось загрузить список доступных дней');
      throw error;
    }
  }

  /**
   * Загрузка данных из JSON файла
   */
  async loadData(date) {
    try {
      // Проверяем, есть ли эта дата в индексе
      const dayInfo = this.state.index.days.find(d => d.date === date);
      
      if (!dayInfo) {
        throw new Error('Date not in index');
      }
      
      if (!dayInfo.available) {
        this.showUnavailable(dayInfo);
        return;
      }
      
      const response = await fetch(`data/${dayInfo.file}`);
      if (!response.ok) throw new Error('File not found');
      
      this.state.data = await response.json();
      this.state.currentDate = date;
      
      // Сбрасываем состояние игры при загрузке нового дня
      this.resetGameState();
      
      this.renderAll();
      this.updateNavigationButtons();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Данные для этой даты не найдены');
    }
  }

  /**
   * Показать сообщение о недоступности дня
   */
  showUnavailable(dayInfo) {
    document.getElementById('sectionsContainer').innerHTML = `
      <div class="unavailable-message">
        <h2>📅 ${dayInfo.hebrewDate}</h2>
        <p style="font-size: 1.3em; margin: 20px 0;">Этот день пока не доступен</p>
        <p style="color: #666;">Материалы скоро будут добавлены!</p>
        <button class="btn" onclick="window.chitasApp.goToLatestDay()">Перейти к последнему дню</button>
      </div>
    `;
    
    // Обновляем заголовок
    document.getElementById('pageTitle').textContent = '📖 Chitas for Kids';
    document.getElementById('hebrewDate').textContent = dayInfo.hebrewDate;
    document.getElementById('dedication').textContent = '';
    
    this.updateNavigationButtons();
  }

  /**
   * Переход к последнему доступному дню
   */
  goToLatestDay() {
    const availableDays = this.state.index.days.filter(d => d.available);
    if (availableDays.length > 0) {
      const latestDay = availableDays[availableDays.length - 1];
      this.navigateToDate(latestDay.date);
    }
  }

  /**
   * Сброс состояния игры
   */
  resetGameState() {
    this.state.score = 0;
    this.state.stars = 0;
    this.state.done = 0;
    this.state.completed = {};
    this.gameStates = {};
  }

  /**
   * Рендер всего контента
   */
  renderAll() {
    this.renderHeader();
    this.renderScoreboard();
    this.renderSections();
    this.renderNavigation();
  }

  /**
   * Рендер шапки
   */
  renderHeader() {
    const { metadata } = this.state.data;
    document.getElementById('pageTitle').textContent = metadata.parsha 
      ? `📖 Chitas for Kids - Недельная глава ${metadata.parsha}`
      : '📖 Chitas for Kids - Хитас для детей';
    
    document.getElementById('hebrewDate').textContent = metadata.hebrewDate;
    document.getElementById('dedication').textContent = metadata.dedication || '';
  }

  /**
   * Рендер счётной панели
   */
  renderScoreboard() {
    const totalSections = this.state.data.sections.length;
    document.getElementById('score').textContent = this.state.score;
    document.getElementById('stars').textContent = this.state.stars;
    document.getElementById('done').textContent = `${this.state.done}/${totalSections}`;
    
    const progress = (this.state.done / totalSections) * 100;
    document.getElementById('progress').style.width = progress + '%';
    document.getElementById('progress').textContent = Math.round(progress) + '%';
    
    // Показать финальный результат
    if (this.state.done === totalSections) {
      document.getElementById('final').classList.add('show');
      document.getElementById('finalScore').textContent = this.state.score + ' баллов!';
    } else {
      document.getElementById('final').classList.remove('show');
    }
  }

  /**
   * Рендер всех разделов
   */
  renderSections() {
    const container = document.getElementById('sectionsContainer');
    container.innerHTML = '';
    
    this.state.data.sections.forEach(section => {
      const sectionEl = this.createSection(section);
      container.appendChild(sectionEl);
    });
  }

  /**
   * Создание одного раздела
   */
  createSection(section) {
    const div = document.createElement('div');
    div.className = 'section';
    div.id = `s${section.id}`;
    
    // Шапка раздела
    const header = document.createElement('div');
    header.className = 'section-header';
    header.onclick = () => this.toggleSection(section.id);
    header.innerHTML = `
      <div class="section-title">${section.title}</div>
      <div class="section-badge">${section.points} баллов</div>
    `;
    
    // Контент раздела
    const content = document.createElement('div');
    content.className = 'section-content';
    
    // Текст
    const storyText = this.renderContent(section.content);
    content.appendChild(storyText);
    
    // Игра
    const game = this.renderGame(section);
    content.appendChild(game);
    
    div.appendChild(header);
    div.appendChild(content);
    
    return div;
  }

  /**
   * Рендер текстового контента
   */
  renderContent(content) {
    const div = document.createElement('div');
    div.className = 'story-text';
    
    content.paragraphs.forEach(para => {
      const p = document.createElement('p');
      
      if (para.type === 'heading') {
        const strong = document.createElement('strong');
        strong.innerHTML = para.text;
        p.appendChild(strong);
      } else if (para.type === 'list') {
        const list = para.items.map((item, i) => `${i + 1}️⃣ ${item}`).join('<br>');
        p.innerHTML = list;
      } else {
        p.innerHTML = para.text;
      }
      
      div.appendChild(p);
    });
    
    // Fun fact
    if (content.funFact) {
      const fact = document.createElement('div');
      fact.className = 'fun-fact';
      fact.innerHTML = content.funFact;
      div.appendChild(fact);
    }
    
    return div;
  }

  /**
   * Рендер игры в зависимости от типа
   */
  renderGame(section) {
    const container = document.createElement('div');
    container.className = 'game-container';
    
    const game = section.game;
    
    if (game.type === 'quiz') {
      container.appendChild(this.createQuiz(section));
    } else if (game.type === 'match') {
      container.appendChild(this.createMatchGame(section));
    } else if (game.type === 'memory') {
      container.appendChild(this.createMemoryGame(section));
    }
    
    return container;
  }

  /**
   * Создание викторины
   */
  createQuiz(section) {
    const div = document.createElement('div');
    const game = section.game;
    
    const title = document.createElement('h3');
    title.textContent = '🎮 Викторина';
    div.appendChild(title);
    
    const question = document.createElement('div');
    question.className = 'quiz-question';
    question.textContent = game.question;
    div.appendChild(question);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.id = `q${section.id}`;
    
    game.options.forEach(option => {
      const optDiv = document.createElement('div');
      optDiv.className = 'quiz-option';
      optDiv.textContent = option.text;
      
      optDiv.onclick = () => {
        if (optDiv.classList.contains('correct') || optDiv.classList.contains('wrong')) return;
        
        optionsContainer.querySelectorAll('.quiz-option').forEach(el => {
          el.style.pointerEvents = 'none';
        });
        
        const feedback = document.getElementById(`f${section.id}`);
        
        if (option.correct) {
          optDiv.classList.add('correct');
          feedback.innerHTML = `<div class="feedback success">${game.successMessage} +${section.points} баллов!</div>`;
          this.addScore(section.points, section.id);
        } else {
          optDiv.classList.add('wrong');
          optionsContainer.querySelectorAll('.quiz-option').forEach(el => {
            const correctOpt = game.options.find(o => o.text === el.textContent && o.correct);
            if (correctOpt) el.classList.add('correct');
          });
          feedback.innerHTML = `<div class="feedback error">${game.errorMessage}</div>`;
        }
      };
      
      optionsContainer.appendChild(optDiv);
    });
    
    div.appendChild(optionsContainer);
    
    const feedback = document.createElement('div');
    feedback.id = `f${section.id}`;
    div.appendChild(feedback);
    
    return div;
  }

  /**
   * Создание игры на соответствие
   */
  createMatchGame(section) {
    const div = document.createElement('div');
    const game = section.game;
    
    const title = document.createElement('h3');
    title.textContent = game.title;
    div.appendChild(title);
    
    const matchContainer = document.createElement('div');
    matchContainer.className = 'match-game';
    
    const leftCol = document.createElement('div');
    leftCol.className = 'match-column';
    leftCol.innerHTML = '<h4>Слова на иврите</h4>';
    const leftItems = document.createElement('div');
    
    const rightCol = document.createElement('div');
    rightCol.className = 'match-column';
    rightCol.innerHTML = '<h4>Русский перевод</h4>';
    const rightItems = document.createElement('div');
    
    const keys = Object.keys(game.pairs);
    const values = Object.values(game.pairs).sort(() => Math.random() - 0.5);
    
    this.gameStates[section.id] = {
      selected1: null,
      selected2: null,
      matchedCount: 0,
      totalPairs: keys.length
    };
    
    const gameState = this.gameStates[section.id];
    
    keys.forEach(key => {
      const item = document.createElement('div');
      item.className = 'match-item';
      item.textContent = key;
      item.dataset.key = key;
      item.onclick = () => this.handleMatchClick(item, 'left', section.id, game);
      leftItems.appendChild(item);
    });
    
    values.forEach(value => {
      const item = document.createElement('div');
      item.className = 'match-item';
      item.textContent = value;
      item.dataset.value = value;
      item.onclick = () => this.handleMatchClick(item, 'right', section.id, game);
      rightItems.appendChild(item);
    });
    
    leftCol.appendChild(leftItems);
    rightCol.appendChild(rightItems);
    matchContainer.appendChild(leftCol);
    matchContainer.appendChild(rightCol);
    div.appendChild(matchContainer);
    
    const feedback = document.createElement('div');
    feedback.id = `f${section.id}`;
    div.appendChild(feedback);
    
    return div;
  }

  /**
   * Обработка клика в игре на соответствие
   */
  handleMatchClick(item, side, sectionId, game) {
    if (item.classList.contains('matched')) return;
    
    const gameState = this.gameStates[sectionId];
    const feedback = document.getElementById(`f${sectionId}`);
    
    if (side === 'left') {
      if (gameState.selected1) gameState.selected1.classList.remove('selected');
      gameState.selected1 = item;
      item.classList.add('selected');
    } else {
      if (gameState.selected2) gameState.selected2.classList.remove('selected');
      gameState.selected2 = item;
      item.classList.add('selected');
    }
    
    if (gameState.selected1 && gameState.selected2) {
      const key = gameState.selected1.dataset.key;
      const value = gameState.selected2.dataset.value;
      
      if (game.pairs[key] === value) {
        gameState.selected1.classList.add('matched');
        gameState.selected2.classList.add('matched');
        gameState.matchedCount++;
        
        if (gameState.matchedCount === gameState.totalPairs) {
          feedback.innerHTML = `<div class="feedback success">${game.successMessage} +${this.state.data.sections.find(s => s.id === sectionId).points} баллов!</div>`;
          this.addScore(this.state.data.sections.find(s => s.id === sectionId).points, sectionId);
        }
      } else {
        feedback.innerHTML = `<div class="feedback error">${game.errorMessage}</div>`;
        setTimeout(() => {
          gameState.selected1.classList.remove('selected');
          gameState.selected2.classList.remove('selected');
          feedback.innerHTML = '';
        }, 1500);
      }
      
      gameState.selected1 = null;
      gameState.selected2 = null;
    }
  }

  /**
   * Создание игры на память
   */
  createMemoryGame(section) {
    const div = document.createElement('div');
    const game = section.game;
    
    const title = document.createElement('h3');
    title.textContent = game.title;
    div.appendChild(title);
    
    const desc = document.createElement('p');
    desc.style.marginBottom = '15px';
    desc.style.color = '#666';
    desc.textContent = game.description;
    div.appendChild(desc);
    
    const grid = document.createElement('div');
    grid.className = 'memory-grid';
    grid.id = `mem${section.id}`;
    
    const deck = [...game.cards, ...game.cards].sort(() => Math.random() - 0.5);
    
    this.gameStates[section.id] = {
      flipped: [],
      matched: [],
      deck: deck
    };
    
    deck.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'memory-card';
      cardEl.textContent = '❓';
      cardEl.dataset.card = card;
      cardEl.dataset.index = index;
      cardEl.onclick = () => this.handleMemoryClick(cardEl, section.id, game);
      grid.appendChild(cardEl);
    });
    
    div.appendChild(grid);
    
    const feedback = document.createElement('div');
    feedback.id = `f${section.id}`;
    div.appendChild(feedback);
    
    return div;
  }

  /**
   * Обработка клика в игре на память
   */
  handleMemoryClick(card, sectionId, game) {
    const gameState = this.gameStates[sectionId];
    const index = parseInt(card.dataset.index);
    
    if (gameState.flipped.length >= 2 || 
        card.classList.contains('flipped') || 
        gameState.matched.includes(index)) return;
    
    card.classList.add('flipped');
    card.textContent = card.dataset.card;
    gameState.flipped.push(index);
    
    if (gameState.flipped.length === 2) {
      setTimeout(() => {
        const idx1 = gameState.flipped[0];
        const idx2 = gameState.flipped[1];
        const card1 = document.querySelector(`#mem${sectionId} [data-index="${idx1}"]`);
        const card2 = document.querySelector(`#mem${sectionId} [data-index="${idx2}"]`);
        
        if (card1.dataset.card === card2.dataset.card) {
          gameState.matched.push(idx1, idx2);
          card1.classList.add('matched');
          card2.classList.add('matched');
          
          if (gameState.matched.length === gameState.deck.length) {
            document.getElementById(`f${sectionId}`).innerHTML = 
              `<div class="feedback success">${game.successMessage} +${this.state.data.sections.find(s => s.id === sectionId).points} баллов!</div>`;
            this.addScore(this.state.data.sections.find(s => s.id === sectionId).points, sectionId);
          }
        } else {
          card1.classList.remove('flipped');
          card2.classList.remove('flipped');
          card1.textContent = '❓';
          card2.textContent = '❓';
        }
        
        gameState.flipped = [];
      }, 800);
    }
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
      document.getElementById(`s${sectionId}`).classList.add('completed');
      this.renderScoreboard();
    }
  }

  /**
   * Переключение раздела
   */
  toggleSection(id) {
    document.getElementById(`s${id}`).classList.toggle('active');
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
    document.getElementById('printBtn').onclick = () => window.print();
  }

  /**
   * Переход к сегодняшнему дню
   */
  goToToday() {
    const today = new Date().toISOString().split('T')[0];
    const todayInfo = this.state.index.days.find(d => d.date === today);
    
    if (todayInfo && todayInfo.available) {
      this.navigateToDate(today);
    } else {
      // Если сегодняшний день недоступен, переходим к последнему доступному
      this.goToLatestDay();
    }
  }

  /**
   * Навигация по дням (смещение)
   */
  async navigateDay(offset) {
    const currentIndex = this.state.index.days.findIndex(d => d.date === this.state.currentDate);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + offset;
    if (newIndex < 0 || newIndex >= this.state.index.days.length) return;
    
    const newDay = this.state.index.days[newIndex];
    await this.navigateToDate(newDay.date);
  }

  /**
   * Навигация к конкретной дате
   */
  async navigateToDate(date) {
    // Обновление URL
    const url = new URL(window.location);
    url.searchParams.set('date', date);
    window.history.pushState({}, '', url);
    
    await this.loadData(date);
  }

  /**
   * Обновление состояния кнопок навигации
   */
  updateNavigationButtons() {
    const currentIndex = this.state.index.days.findIndex(d => d.date === this.state.currentDate);
    
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    
    if (!prevBtn || !nextBtn) return;
    
    // Предыдущий день
    if (currentIndex > 0) {
      prevBtn.disabled = false;
    } else {
      prevBtn.disabled = true;
    }
    
    // Следующий день
    if (currentIndex < this.state.index.days.length - 1) {
      nextBtn.disabled = false;
    } else {
      nextBtn.disabled = true;
    }
  }

  /**
   * Показать ошибку
   */
  showError(message) {
    document.getElementById('sectionsContainer').innerHTML = `
      <div class="error-message">
        <h2>😔 ${message}</h2>
        <button class="btn" onclick="window.chitasApp.goToLatestDay()">К последнему доступному дню</button>
      </div>
    `;
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  window.chitasApp = new ChitasApp();
});
