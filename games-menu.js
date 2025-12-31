/* ===============================
   🎮 GAMES MENU SYSTEM
   Система выбора мини-игр
   =============================== */

class GamesMenu {
  constructor(container, games, sectionId, onGameComplete) {
    this.container = container;
    this.games = games;
    this.sectionId = sectionId;
    this.onGameComplete = onGameComplete;
    this.completedGames = new Set();
    this.totalScore = 0;
    
    this.init();
  }

  init() {
    this.renderMenu();
  }

  renderMenu() {
    const menuHTML = `
      <div class="games-menu">
        <div class="games-menu-header">
          <h3>🎮 Выбери игру для закрепления материала!</h3>
          <div class="games-stats">
            <span>⭐ Всего баллов: <strong>${this.totalScore}</strong></span>
            <span>✅ Пройдено: <strong>${this.completedGames.size}/${this.games.length}</strong></span>
          </div>
        </div>

        <div class="games-grid">
          ${this.games.map((game, index) => this.renderGameCard(game, index)).join('')}
        </div>

        <div id="game-area-${this.sectionId}" class="game-area"></div>
      </div>
    `;

    this.container.innerHTML = menuHTML;
    this.attachEventListeners();
  }

  renderGameCard(game, index) {
    const isCompleted = this.completedGames.has(index);
    const gameIcons = {
      'quiz': '🎯',
      'wheel': '🎪',
      'truefalse': '🎲',
      'match': '🏆',
      'memory': '🎴',
      'anagram': '🔤'
    };

    const gameDifficulty = {
      'easy': '⭐',
      'medium': '⭐⭐',
      'hard': '⭐⭐⭐'
    };

    const icon = gameIcons[game.type] || '🎮';
    const difficulty = gameDifficulty[game.difficulty] || '⭐⭐';

    return `
      <div class="game-card ${isCompleted ? 'completed' : ''}" data-game-index="${index}">
        <div class="game-card-icon">${icon}</div>
        <h4 class="game-card-title">${game.title}</h4>
        <p class="game-card-description">${game.description || ''}</p>
        <div class="game-card-difficulty">${difficulty}</div>
        ${isCompleted ? '<div class="game-card-badge">✅ Пройдено</div>' : ''}
        <button class="game-card-btn" data-game-index="${index}">
          ${isCompleted ? '🔄 Играть ещё' : '▶️ Играть'}
        </button>
      </div>
    `;
  }

  attachEventListeners() {
    const buttons = this.container.querySelectorAll('.game-card-btn');
    buttons.forEach(btn => {
      btn.onclick = () => {
        const index = parseInt(btn.dataset.gameIndex);
        this.startGame(index);
      };
    });
  }

  startGame(index) {
    const game = this.games[index];
    const gameArea = document.getElementById(`game-area-${this.sectionId}`);
    
    // Скрываем меню, показываем игру
    this.container.querySelector('.games-menu-header').style.display = 'none';
    this.container.querySelector('.games-grid').style.display = 'none';
    gameArea.style.display = 'block';
    
    // Кнопка "Вернуться к меню"
    const backBtn = `
      <button class="back-to-menu-btn" onclick="window.gamesMenu${this.sectionId}.backToMenu()">
        ◀ Вернуться к меню игр
      </button>
    `;

    // Запускаем нужную игру
    switch (game.type) {
      case 'quiz':
        this.startQuiz(game, gameArea, backBtn, index);
        break;
      case 'wheel':
        this.startWheel(game, gameArea, backBtn, index);
        break;
      case 'truefalse':
        this.startTrueFalse(game, gameArea, backBtn, index);
        break;
      case 'match':
        this.startMatch(game, gameArea, backBtn, index);
        break;
      case 'memory':
        this.startMemory(game, gameArea, backBtn, index);
        break;
      case 'anagram':
        this.startAnagram(game, gameArea, backBtn, index);
        break;
      default:
        gameArea.innerHTML = `<p>Игра "${game.type}" пока не реализована</p>`;
    }
  }

  startQuiz(game, gameArea, backBtn, index) {
    gameArea.innerHTML = `
      ${backBtn}
      <div class="game-container">
        <h3>🎯 ${game.title}</h3>
        <div class="quiz-question">${game.question}</div>
        <div id="quiz-options-${this.sectionId}">
          ${game.options.map((opt, idx) => `
            <div class="quiz-option" data-index="${idx}" data-correct="${opt.correct}">
              ${opt.text}
            </div>
          `).join('')}
        </div>
        <div id="quiz-feedback-${this.sectionId}"></div>
      </div>
    `;

    const options = gameArea.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      opt.onclick = () => this.handleQuizAnswer(opt, game, index);
    });
  }

  handleQuizAnswer(option, game, gameIndex) {
    if (option.classList.contains('correct') || option.classList.contains('wrong')) return;
    
    const options = option.parentElement.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.style.pointerEvents = 'none');
    
    const isCorrect = option.dataset.correct === 'true';
    const feedback = document.getElementById(`quiz-feedback-${this.sectionId}`);
    
    if (isCorrect) {
      option.classList.add('correct');
      feedback.innerHTML = `<div class="feedback success">${game.successMessage || '✅ Правильно!'}</div>`;
      this.onGameCompleted(gameIndex, 10);
    } else {
      option.classList.add('wrong');
      options.forEach(opt => {
        if (opt.dataset.correct === 'true') opt.classList.add('correct');
      });
      feedback.innerHTML = `<div class="feedback error">${game.errorMessage || '❌ Неправильно'}</div>`;
    }
  }

  startWheel(game, gameArea, backBtn, index) {
    gameArea.innerHTML = `${backBtn}<div id="wheel-container-${this.sectionId}"></div>`;
    
    const wheelContainer = document.getElementById(`wheel-container-${this.sectionId}`);
    const wheelQuestions = game.questions.map(q => ({
      question: q.question,
      options: q.options,
      correct: q.correct,
      successMessage: game.successMessage || '✅ Правильно!',
      errorMessage: game.errorMessage || '❌ Попробуй ещё!'
    }));

    if (window.WheelGame) {
      new window.WheelGame(wheelContainer, wheelQuestions, (score) => {
        this.onGameCompleted(index, score);
      });
    } else {
      wheelContainer.innerHTML = '<p>Загрузка колеса удачи...</p>';
    }
  }

  startTrueFalse(game, gameArea, backBtn, index) {
    let currentQuestion = 0;
    let score = 0;

    const showQuestion = () => {
      if (currentQuestion >= game.statements.length) {
        gameArea.innerHTML = `
          ${backBtn}
          <div class="game-complete">
            <h2>🎉 Завершено!</h2>
            <div class="score-big">⭐ ${score}</div>
            <p>Правильных ответов: ${score}/${game.statements.length}</p>
          </div>
        `;
        this.onGameCompleted(index, score * 5);
        return;
      }

      const stmt = game.statements[currentQuestion];
      gameArea.innerHTML = `
        ${backBtn}
        <div class="game-container">
          <h3>🎲 ${game.title}</h3>
          <div class="progress-bar">
            Вопрос ${currentQuestion + 1} из ${game.statements.length}
          </div>
          <div class="truefalse-question">${stmt.text}</div>
          <div class="truefalse-buttons">
            <button class="tf-btn true-btn" data-answer="true">✅ ПРАВДА</button>
            <button class="tf-btn false-btn" data-answer="false">❌ ЛОЖЬ</button>
          </div>
          <div id="tf-feedback-${this.sectionId}"></div>
        </div>
      `;

      const buttons = gameArea.querySelectorAll('.tf-btn');
      buttons.forEach(btn => {
        btn.onclick = () => {
          const userAnswer = btn.dataset.answer === 'true';
          const isCorrect = userAnswer === stmt.answer;
          
          buttons.forEach(b => b.disabled = true);
          
          const feedback = document.getElementById(`tf-feedback-${this.sectionId}`);
          if (isCorrect) {
            btn.classList.add('correct');
            feedback.innerHTML = '<div class="feedback success">✅ Правильно!</div>';
            score++;
          } else {
            btn.classList.add('wrong');
            feedback.innerHTML = '<div class="feedback error">❌ Неправильно!</div>';
          }

          setTimeout(() => {
            currentQuestion++;
            showQuestion();
          }, 1500);
        };
      });
    };

    showQuestion();
  }

  startMatch(game, gameArea, backBtn, index) {
    let selected = null;
    let matched = new Set();
    let score = 0;

    const shuffle = (array) => {
      return array.sort(() => Math.random() - 0.5);
    };

    // Создаём левый и правый столбцы
    const leftItems = game.pairs.map((pair, idx) => ({ text: pair.left, idx, side: 'left' }));
    const rightItems = shuffle(game.pairs.map((pair, idx) => ({ text: pair.right, idx, side: 'right' })));

    const renderMatch = () => {
      gameArea.innerHTML = `
        ${backBtn}
        <div class="game-container">
          <h3>🏆 ${game.title}</h3>
          <p style="color: #666;">Соедини пары! Нажми на элемент слева, затем на соответствующий справа.</p>
          <div class="match-progress">Найдено пар: ${matched.size}/${game.pairs.length}</div>
          <div class="match-container">
            <div class="match-column">
              ${leftItems.map(item => `
                <div class="match-item ${matched.has(item.idx) ? 'matched' : ''}" 
                     data-idx="${item.idx}" 
                     data-side="left">
                  ${item.text}
                </div>
              `).join('')}
            </div>
            <div class="match-column">
              ${rightItems.map(item => `
                <div class="match-item ${matched.has(item.idx) ? 'matched' : ''}" 
                     data-idx="${item.idx}" 
                     data-side="right">
                  ${item.text}
                </div>
              `).join('')}
            </div>
          </div>
          <div id="match-feedback"></div>
        </div>
      `;

      const items = gameArea.querySelectorAll('.match-item');
      items.forEach(item => {
        item.onclick = () => {
          const idx = parseInt(item.dataset.idx);
          const side = item.dataset.side;

          if (matched.has(idx)) return;

          // Первый клик - выбираем левый элемент
          if (!selected && side === 'left') {
            selected = { idx, element: item };
            item.classList.add('selected');
          }
          // Второй клик - проверяем правый элемент
          else if (selected && side === 'right') {
            const feedback = document.getElementById('match-feedback');
            
            if (selected.idx === idx) {
              // Правильно!
              matched.add(idx);
              selected.element.classList.remove('selected');
              selected.element.classList.add('matched');
              item.classList.add('matched');
              feedback.innerHTML = '<div class="feedback success">✅ Правильно!</div>';
              score += 10;

              setTimeout(() => {
                feedback.innerHTML = '';
                if (matched.size === game.pairs.length) {
                  // Все пары найдены!
                  gameArea.innerHTML = `
                    ${backBtn}
                    <div class="game-complete">
                      <h2>🎉 Все пары найдены!</h2>
                      <div class="score-big">⭐ ${score}</div>
                      <p>Ты нашёл все ${game.pairs.length} пар!</p>
                    </div>
                  `;
                  this.onGameCompleted(index, score);
                }
              }, 500);
            } else {
              // Неправильно
              selected.element.classList.remove('selected');
              item.classList.add('wrong');
              feedback.innerHTML = '<div class="feedback error">❌ Неправильно! Попробуй ещё раз.</div>';
              
              setTimeout(() => {
                item.classList.remove('wrong');
                feedback.innerHTML = '';
              }, 1000);
            }

            selected = null;
          }
          // Клик на другой левый элемент - меняем выбор
          else if (selected && side === 'left') {
            selected.element.classList.remove('selected');
            selected = { idx, element: item };
            item.classList.add('selected');
          }
        };
      });
    };

    renderMatch();
  }

  startMemory(game, gameArea, backBtn, index) {
    let flipped = [];
    let matched = new Set();
    let moves = 0;
    let score = 0;

    // Создаём пары карточек
    const cards = [];
    game.pairs.forEach((pair, idx) => {
      cards.push({ id: idx * 2, pairId: idx, text: pair.card1, emoji: pair.emoji1 || '❓' });
      cards.push({ id: idx * 2 + 1, pairId: idx, text: pair.card2, emoji: pair.emoji2 || '❓' });
    });

    // Перемешиваем
    const shuffled = cards.sort(() => Math.random() - 0.5);

    const renderMemory = () => {
      gameArea.innerHTML = `
        ${backBtn}
        <div class="game-container">
          <h3>🎴 ${game.title}</h3>
          <div class="memory-stats">
            <span>🎯 Ходов: ${moves}</span>
            <span>✅ Пар найдено: ${matched.size}/${game.pairs.length}</span>
          </div>
          <div class="memory-grid">
            ${shuffled.map(card => `
              <div class="memory-card ${matched.has(card.pairId) ? 'matched' : ''}" 
                   data-id="${card.id}"
                   data-pair="${card.pairId}">
                <div class="memory-card-inner">
                  <div class="memory-card-front">❓</div>
                  <div class="memory-card-back">
                    <div class="memory-emoji">${card.emoji}</div>
                    <div class="memory-text">${card.text}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div id="memory-feedback"></div>
        </div>
      `;

      const cardElements = gameArea.querySelectorAll('.memory-card');
      cardElements.forEach(cardEl => {
        cardEl.onclick = () => {
          // Игнорируем если уже найдена или уже открыто 2 карты
          if (matched.has(parseInt(cardEl.dataset.pair)) || 
              flipped.length >= 2 || 
              cardEl.classList.contains('flipped')) {
            return;
          }

          // Переворачиваем карту
          cardEl.classList.add('flipped');
          const cardId = parseInt(cardEl.dataset.id);
          const pairId = parseInt(cardEl.dataset.pair);
          
          flipped.push({ id: cardId, pairId, element: cardEl });

          // Если открыто 2 карты - проверяем
          if (flipped.length === 2) {
            moves++;
            
            setTimeout(() => {
              if (flipped[0].pairId === flipped[1].pairId) {
                // Совпадение!
                matched.add(flipped[0].pairId);
                flipped[0].element.classList.add('matched');
                flipped[1].element.classList.add('matched');
                score += 10;

                const feedback = document.getElementById('memory-feedback');
                feedback.innerHTML = '<div class="feedback success">✅ Пара найдена!</div>';
                setTimeout(() => feedback.innerHTML = '', 1000);

                // Проверяем завершение
                if (matched.size === game.pairs.length) {
                  setTimeout(() => {
                    gameArea.innerHTML = `
                      ${backBtn}
                      <div class="game-complete">
                        <h2>🎊 Все пары найдены!</h2>
                        <div class="score-big">⭐ ${score}</div>
                        <p>Количество ходов: ${moves}</p>
                        <p>${moves <= game.pairs.length * 2 ? '🏆 Отличный результат!' : 'Хорошая попытка!'}</p>
                      </div>
                    `;
                    this.onGameCompleted(index, score);
                  }, 500);
                }
              } else {
                // Не совпадают - переворачиваем обратно
                flipped[0].element.classList.remove('flipped');
                flipped[1].element.classList.remove('flipped');
              }

              flipped = [];
              
              // Обновляем счётчик ходов
              const stats = gameArea.querySelector('.memory-stats');
              if (stats) {
                stats.innerHTML = `
                  <span>🎯 Ходов: ${moves}</span>
                  <span>✅ Пар найдено: ${matched.size}/${game.pairs.length}</span>
                `;
              }
            }, 800);
          }
        };
      });
    };

    renderMemory();
  }

  startAnagram(game, gameArea, backBtn, index) {
    let currentWord = 0;
    let score = 0;

    const showWord = () => {
      if (currentWord >= game.words.length) {
        gameArea.innerHTML = `
          ${backBtn}
          <div class="game-complete">
            <h2>🎉 Все слова составлены!</h2>
            <div class="score-big">⭐ ${score * 10}</div>
            <p>Правильных слов: ${score}/${game.words.length}</p>
          </div>
        `;
        this.onGameCompleted(index, score * 10);
        return;
      }

      const word = game.words[currentWord];
      const scrambled = word.answer.split('').sort(() => Math.random() - 0.5);

      gameArea.innerHTML = `
        ${backBtn}
        <div class="game-container">
          <h3>🔤 ${game.title}</h3>
          <div class="progress-bar">
            Слово ${currentWord + 1} из ${game.words.length}
          </div>
          <div class="anagram-hint">
            💡 Подсказка: ${word.hint}
          </div>
          <div class="anagram-letters" id="anagram-letters-${this.sectionId}">
            ${scrambled.map(letter => `
              <div class="anagram-letter" data-letter="${letter}">
                ${letter}
              </div>
            `).join('')}
          </div>
          <div class="anagram-answer" id="anagram-answer-${this.sectionId}">
            ${word.answer.split('').map(() => '<div class="anagram-slot"></div>').join('')}
          </div>
          <div class="anagram-buttons">
            <button class="anagram-clear-btn">🔄 Сбросить</button>
            <button class="anagram-check-btn">✅ Проверить</button>
          </div>
          <div id="anagram-feedback-${this.sectionId}"></div>
        </div>
      `;

      let userAnswer = [];
      const lettersEl = document.getElementById(`anagram-letters-${this.sectionId}`);
      const answerEl = document.getElementById(`anagram-answer-${this.sectionId}`);
      const feedback = document.getElementById(`anagram-feedback-${this.sectionId}`);

      const letters = lettersEl.querySelectorAll('.anagram-letter');
      const slots = answerEl.querySelectorAll('.anagram-slot');

      letters.forEach(letter => {
        letter.onclick = () => {
          if (letter.classList.contains('used')) return;
          if (userAnswer.length >= word.answer.length) return;

          const letterText = letter.dataset.letter;
          userAnswer.push(letterText);
          letter.classList.add('used');

          // Обновляем слоты
          slots[userAnswer.length - 1].textContent = letterText;
          slots[userAnswer.length - 1].classList.add('filled');
        };
      });

      // Кнопка сброса
      gameArea.querySelector('.anagram-clear-btn').onclick = () => {
        userAnswer = [];
        letters.forEach(l => l.classList.remove('used'));
        slots.forEach(s => {
          s.textContent = '';
          s.classList.remove('filled');
        });
        feedback.innerHTML = '';
      };

      // Кнопка проверки
      gameArea.querySelector('.anagram-check-btn').onclick = () => {
        const answer = userAnswer.join('');
        
        if (answer.length !== word.answer.length) {
          feedback.innerHTML = '<div class="feedback error">⚠️ Составь полное слово!</div>';
          return;
        }

        if (answer.toUpperCase() === word.answer.toUpperCase()) {
          feedback.innerHTML = '<div class="feedback success">✅ Правильно!</div>';
          score++;
          
          setTimeout(() => {
            currentWord++;
            showWord();
          }, 1500);
        } else {
          feedback.innerHTML = '<div class="feedback error">❌ Неправильно! Попробуй ещё!</div>';
          setTimeout(() => {
            userAnswer = [];
            letters.forEach(l => l.classList.remove('used'));
            slots.forEach(s => {
              s.textContent = '';
              s.classList.remove('filled');
            });
            feedback.innerHTML = '';
          }, 1500);
        }
      };
    };

    showWord();
  }

  onGameCompleted(gameIndex, score) {
    this.completedGames.add(gameIndex);
    this.totalScore += score;
    
    // Уведомляем родителя
    if (this.onGameComplete) {
      this.onGameComplete(this.totalScore);
    }

    // Показываем кнопку возврата
    setTimeout(() => {
      const gameArea = document.getElementById(`game-area-${this.sectionId}`);
      const backBtn = gameArea.querySelector('.back-to-menu-btn');
      if (backBtn) {
        backBtn.style.display = 'block';
        backBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 2000);
  }

  backToMenu() {
    this.container.querySelector('.games-menu-header').style.display = 'block';
    this.container.querySelector('.games-grid').style.display = 'grid';
    document.getElementById(`game-area-${this.sectionId}`).style.display = 'none';
    
    // Перерендериваем меню с обновлёнными статусами
    const grid = this.container.querySelector('.games-grid');
    grid.innerHTML = this.games.map((game, index) => this.renderGameCard(game, index)).join('');
    this.attachEventListeners();
    
    // Обновляем статистику
    const statsHTML = `
      <span>⭐ Всего баллов: <strong>${this.totalScore}</strong></span>
      <span>✅ Пройдено: <strong>${this.completedGames.size}/${this.games.length}</strong></span>
    `;
    this.container.querySelector('.games-stats').innerHTML = statsHTML;
  }
}

// Глобальный доступ
window.GamesMenu = GamesMenu;
