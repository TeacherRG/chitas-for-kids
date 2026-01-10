/**
 * Weekly Trivia Manager - Недельная викторина с бонусными баллами
 * Собирает игры (quiz, match, truefalse) из последних 6 дней по всем разделам
 */

'use strict';

// Конфигурация разделов
const TRIVIA_SECTIONS_CONFIG = {
    chumash: {
        id: 'chumash',
        title: "ХУМАШ",
        color: "#FF6B6B",
        icon: "📖",
        bonusPoints: 50
    },
    tehillim: {
        id: 'tehillim',
        title: "ТЕИЛИМ",
        color: "#4ECDC4",
        icon: "📿",
        bonusPoints: 50
    },
    tanya: {
        id: 'tanya',
        title: "ТАНИЯ",
        color: "#45B7D1",
        icon: "📕",
        bonusPoints: 50
    },
    "hayom-yom": {
        id: 'hayom-yom',
        title: "АЙОМ ЙОМ",
        color: "#FFEAA7",
        icon: "📅",
        bonusPoints: 50
    },
    rambam: {
        id: 'rambam',
        title: "РАМБАМ",
        color: "#96CEB4",
        icon: "⚖️",
        bonusPoints: 50
    },
    geula: {
        id: 'geula',
        title: "ГЕУЛА И МОШИАХ",
        color: "#DFE6E9",
        icon: "🌟",
        bonusPoints: 50
    }
};

// Названия дней недели на русском
const DAY_NAMES = {
    0: "Воскресенье",
    1: "Понедельник",
    2: "Вторник",
    3: "Среда",
    4: "Четверг",
    5: "Пятница",
    6: "Суббота"
};

// Типы игр с иконками
const GAME_TYPES = {
    quiz: { title: 'Викторина', icon: '🎯' },
    match: { title: 'Найди пару', icon: '🔗' },
    truefalse: { title: 'Правда/Ложь', icon: '✓' }
};

class WeeklyTriviaManager {
    constructor(chitasApp) {
        this.app = chitasApp;
        this.currentQuiz = null;
        this.currentSection = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];
        this.weeklyQuizzes = {};

        // Настройки фильтра типов игр
        this.gameTypeFilter = {
            quiz: true,
            match: true,
            truefalse: true
        };

        // Таймер
        this.timerDuration = 30; // 30 секунд
        this.timeRemaining = 30;
        this.timerInterval = null;
        this.timerEnabled = true;

        // Звуковой менеджер
        try {
            this.soundManager = new TriviaSoundManager();
        } catch (error) {
            console.warn('Не удалось инициализировать звуковой менеджер:', error);
            this.soundManager = null;
        }
    }

    /**
     * Получает пути к файлам за последние N дней
     */
    getLastNDaysFilePaths(daysCount = 6) {
        const paths = [];
        const today = new Date();

        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            const filename = `${year}-${month}-${day}-games.json`;
            paths.push(filename);
        }

        return paths;
    }

    /**
     * Определяет день недели из даты
     */
    getDayNameFromDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const dayOfWeek = date.getDay();
        return DAY_NAMES[dayOfWeek] || dateString;
    }

    /**
     * Выбирает случайную игру из доступных типов
     */
    selectRandomGame(games, allowedTypes) {
        // Фильтруем игры по разрешенным типам
        const filteredGames = games.filter(game =>
            allowedTypes[game.type] &&
            (game.type === 'quiz' || game.type === 'match' || game.type === 'truefalse')
        );

        if (filteredGames.length === 0) {
            return null;
        }

        // Выбираем случайную игру
        const randomIndex = Math.floor(Math.random() * filteredGames.length);
        return filteredGames[randomIndex];
    }

    /**
     * Загружает недельную викторину для указанного раздела
     */
    async loadWeeklyQuiz(sectionId) {
        const section = TRIVIA_SECTIONS_CONFIG[sectionId];
        if (!section) {
            console.error(`Неизвестный раздел: ${sectionId}`);
            return null;
        }

        const filePaths = this.getLastNDaysFilePaths(6);
        const games = [];

        for (const filename of filePaths) {
            try {
                const response = await fetch(`data/${filename}`);
                if (!response.ok) {
                    console.warn(`Не удалось загрузить файл: ${filename}`);
                    continue;
                }

                const gamesData = await response.json();

                if (!gamesData.date) {
                    console.warn(`Отсутствует поле date в файле: ${filename}`);
                    continue;
                }

                if (!gamesData.games || !gamesData.games[sectionId]) {
                    console.warn(`Раздел ${sectionId} отсутствует в файле: ${filename}`);
                    continue;
                }

                const sectionGames = gamesData.games[sectionId];

                // Выбираем случайную игру разрешенного типа
                const selectedGame = this.selectRandomGame(sectionGames, this.gameTypeFilter);

                if (!selectedGame) {
                    console.warn(`Нет подходящих игр в разделе ${sectionId} файла: ${filename}`);
                    continue;
                }

                const dayName = this.getDayNameFromDate(gamesData.date);

                // Для True/False разбиваем на отдельные игры для каждого вопроса
                if (selectedGame.type === 'truefalse' && selectedGame.questions && selectedGame.questions.length > 0) {
                    selectedGame.questions.forEach((question, index) => {
                        games.push({
                            day: `${dayName} (${index + 1}/${selectedGame.questions.length})`,
                            date: gamesData.date,
                            type: 'truefalse',
                            gameData: {
                                type: 'truefalse',
                                question: question  // Один вопрос
                            }
                        });
                    });
                } else {
                    // Для остальных типов игр добавляем как обычно
                    games.push({
                        day: dayName,
                        date: gamesData.date,
                        type: selectedGame.type,
                        gameData: selectedGame
                    });
                }

            } catch (error) {
                console.error(`Ошибка при обработке файла ${filename}:`, error);
                continue;
            }
        }

        games.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            type: "weekly-trivia",
            sectionId: sectionId,
            title: `🎯 Недельная викторина - ${section.title}`,
            category: sectionId,
            color: section.color,
            icon: section.icon,
            bonusPoints: section.bonusPoints,
            gamesCount: games.length,
            games: games
        };
    }

    /**
     * Загружает все недельные викторины
     */
    async loadAllWeeklyQuizzes() {
        const sections = Object.keys(TRIVIA_SECTIONS_CONFIG);
        this.weeklyQuizzes = {};

        for (const sectionId of sections) {
            try {
                const quiz = await this.loadWeeklyQuiz(sectionId);
                if (quiz && quiz.games.length > 0) {
                    this.weeklyQuizzes[sectionId] = quiz;
                }
            } catch (error) {
                console.error(`Не удалось загрузить викторину для ${sectionId}:`, error);
            }
        }

        return this.weeklyQuizzes;
    }

    /**
     * Рендерит фильтр типов игр
     */
    renderGameTypeFilter() {
        return `
            <div class="card game-type-filter">
                <h3>🎮 Выбери типы игр</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                    Каждый день будет выбираться случайная игра из выбранных типов
                </p>
                <div class="game-type-toggles">
                    <label class="game-type-toggle">
                        <input type="checkbox" id="filterQuiz" ${this.gameTypeFilter.quiz ? 'checked' : ''}>
                        <span class="toggle-label">
                            <span class="toggle-icon">🎯</span>
                            Викторина
                        </span>
                    </label>
                    <label class="game-type-toggle">
                        <input type="checkbox" id="filterMatch" ${this.gameTypeFilter.match ? 'checked' : ''}>
                        <span class="toggle-label">
                            <span class="toggle-icon">🔗</span>
                            Найди пару
                        </span>
                    </label>
                    <label class="game-type-toggle">
                        <input type="checkbox" id="filterTrueFalse" ${this.gameTypeFilter.truefalse ? 'checked' : ''}>
                        <span class="toggle-label">
                            <span class="toggle-icon">✓</span>
                            Правда/Ложь
                        </span>
                    </label>
                </div>
                <button class="btn" id="applyGameFilter" style="width: 100%; margin-top: 15px;">
                    🔄 Обновить игры
                </button>
            </div>
        `;
    }

    /**
     * Рендерит список разделов для выбора
     */
    renderSectionSelection() {
        const container = document.querySelector('.weekly-trivia-sections');
        if (!container) return;

        container.innerHTML = '';

        Object.values(this.weeklyQuizzes).forEach(quiz => {
            if (!quiz || quiz.games.length === 0) return;

            const isCompleted = this.isWeeklyQuizCompleted(quiz.sectionId);

            const card = document.createElement('div');
            card.className = `trivia-section-card ${isCompleted ? 'completed' : ''}`;
            card.style.setProperty('--section-color', quiz.color);

            card.innerHTML = `
                <div class="trivia-section-icon">${quiz.icon}</div>
                <div class="trivia-section-title">${quiz.title}</div>
                <div class="trivia-section-info">
                    <span class="trivia-questions-count">🎮 ${quiz.gamesCount} игр</span>
                    <span class="trivia-bonus-points">+${quiz.bonusPoints} 🌟</span>
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <span class="trivia-status ${isCompleted ? 'completed' : 'pending'}">
                        ${isCompleted ? '✅ Пройдено' : '⏳ Начать'}
                    </span>
                </div>
            `;

            card.addEventListener('click', () => {
                this.startWeeklyQuiz(quiz.sectionId);
            });

            container.appendChild(card);
        });
    }

    /**
     * Проверяет, пройдена ли недельная викторина
     */
    isWeeklyQuizCompleted(sectionId) {
        const weekKey = this.getWeekKey();
        const completed = this.app.state.weeklyTrivia || {};
        return completed[weekKey]?.[sectionId] || false;
    }

    /**
     * Получает ключ текущей недели
     */
    getWeekKey() {
        const today = new Date();
        const year = today.getFullYear();
        const week = this.getWeekNumber(today);
        return `${year}-W${week}`;
    }

    /**
     * Получает номер недели
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Запускает недельную викторину
     */
    async startWeeklyQuiz(sectionId) {
        if (this.isWeeklyQuizCompleted(sectionId)) {
            const retry = confirm('Вы уже прошли эту викторину на этой неделе! Хотите пройти ещё раз? (баллы не будут засчитаны)');
            if (!retry) return;
        }

        this.currentQuiz = this.weeklyQuizzes[sectionId];
        if (!this.currentQuiz) {
            alert('Викторина не найдена');
            return;
        }

        this.currentSection = TRIVIA_SECTIONS_CONFIG[sectionId];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];

        this.renderQuizView();
    }

    /**
     * Рендерит view викторины
     */
    renderQuizView() {
        const container = document.getElementById('weeklyTriviaContent');
        if (!container) return;

        container.innerHTML = `
            <div class="weekly-quiz-container">
                <div class="weekly-quiz-header" style="--section-color: ${this.currentSection.color}; --section-color-dark: ${this.adjustColor(this.currentSection.color, -20)};">
                    <h2>${this.currentSection.icon} ${this.currentSection.title}</h2>
                    <p>Недельная викторина</p>
                    <div class="weekly-quiz-progress">
                        <div class="weekly-quiz-progress-bar">
                            <div class="weekly-quiz-progress-fill" id="weeklyQuizProgressFill" style="width: 0%"></div>
                        </div>
                        <div style="margin-top: 8px; color: white; font-size: 14px;">
                            Игра <span id="currentQuestionNum">1</span> из ${this.currentQuiz.gamesCount}
                        </div>
                    </div>
                </div>
                <div id="weeklyQuizQuestionContainer"></div>
            </div>
        `;

        this.renderCurrentGame();
    }

    /**
     * Затемняет или осветляет цвет
     */
    adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    /**
     * Запускает таймер
     */
    startTimer() {
        if (!this.timerEnabled) return;

        this.stopTimer(); // Останавливаем предыдущий таймер если есть
        this.timeRemaining = this.timerDuration;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            // Звук тика каждую секунду в последние 5 секунд
            if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
                if (this.soundManager) this.soundManager.playTickSound();
            }

            // Предупреждение на 10 секундах
            if (this.timeRemaining === 10) {
                if (this.soundManager) this.soundManager.playWarningSound();
            }

            // Время вышло
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                if (this.soundManager) this.soundManager.playTimeUpSound();
                this.handleTimeUp();
            }
        }, 1000);

        // Звук начала
        if (this.soundManager) this.soundManager.playStartSound();
    }

    /**
     * Останавливает таймер
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Обновляет отображение таймера
     */
    updateTimerDisplay() {
        const timerElement = document.getElementById('weeklyQuizTimer');
        const timerBarElement = document.getElementById('weeklyQuizTimerBar');

        if (timerElement) {
            timerElement.textContent = this.timeRemaining;

            // Меняем цвет при малом времени
            if (this.timeRemaining <= 5) {
                timerElement.style.color = '#f44336';
                timerElement.style.animation = 'pulse-timer 0.5s infinite';
            } else if (this.timeRemaining <= 10) {
                timerElement.style.color = '#ff9800';
            } else {
                timerElement.style.color = 'white';
                timerElement.style.animation = 'none';
            }
        }

        if (timerBarElement) {
            const percentage = (this.timeRemaining / this.timerDuration) * 100;
            timerBarElement.style.width = `${percentage}%`;

            // Меняем цвет полосы
            if (this.timeRemaining <= 5) {
                timerBarElement.style.background = '#f44336';
            } else if (this.timeRemaining <= 10) {
                timerBarElement.style.background = '#ff9800';
            } else {
                timerBarElement.style.background = 'white';
            }
        }
    }

    /**
     * Обработчик истечения времени
     */
    handleTimeUp() {
        // Автоматически засчитываем как неправильный ответ
        this.answers.push({
            gameIndex: this.currentQuestionIndex,
            correct: false,
            timeUp: true
        });

        // Показываем сообщение
        const gameContainer = document.getElementById('weeklyGameContainer');
        if (gameContainer) {
            const timeUpMessage = document.createElement('div');
            timeUpMessage.className = 'time-up-message';
            timeUpMessage.innerHTML = `
                <div style="text-align: center; padding: 20px; background: #f44336; color: white; border-radius: 10px; margin: 20px 0;">
                    <div style="font-size: 48px;">⏰</div>
                    <h3>Время вышло!</h3>
                    <p>К сожалению, вы не успели ответить</p>
                </div>
            `;
            gameContainer.appendChild(timeUpMessage);

            // Отключаем все интерактивные элементы
            gameContainer.querySelectorAll('.weekly-quiz-option, .truefalse-btn, .match-item, button').forEach(el => {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.5';
            });
        }

        // Показываем кнопку "Далее"
        const navContainer = document.getElementById('weeklyQuizNav');
        if (navContainer) {
            navContainer.style.display = 'flex';
            const nextBtn = document.getElementById('weeklyQuizNextBtn');
            if (nextBtn) {
                nextBtn.onclick = () => this.nextGame();
            }
        }
    }

    /**
     * Рендерит текущую игру
     */
    renderCurrentGame() {
        const container = document.getElementById('weeklyQuizQuestionContainer');
        if (!container) return;

        const currentGame = this.currentQuiz.games[this.currentQuestionIndex];
        const gameType = currentGame.type;
        const gameData = currentGame.gameData;

        // Создаем обертку для игры с таймером
        container.innerHTML = `
            <div class="weekly-question-card">
                <div class="weekly-question-day" style="background: ${this.currentSection.color};">
                    ${currentGame.day} • ${GAME_TYPES[gameType].icon} ${GAME_TYPES[gameType].title}
                </div>
                <div class="weekly-quiz-timer-container">
                    <div class="timer-label">Время:</div>
                    <div class="timer-display" id="weeklyQuizTimer">${this.timerDuration}</div>
                    <div class="timer-bar-container">
                        <div class="timer-bar" id="weeklyQuizTimerBar" style="width: 100%;"></div>
                    </div>
                </div>
                <div id="weeklyGameContainer"></div>
                <div class="weekly-quiz-nav" id="weeklyQuizNav" style="display: none;">
                    <button class="btn" id="weeklyQuizNextBtn">Далее ▶</button>
                </div>
            </div>
        `;

        // Рендерим конкретный тип игры
        this.renderGameByType(gameType, gameData);

        // Обновляем прогресс
        this.updateProgress();

        // Запускаем таймер
        this.startTimer();
    }

    /**
     * Рендерит игру по типу
     */
    renderGameByType(gameType, gameData) {
        const gameContainer = document.getElementById('weeklyGameContainer');
        if (!gameContainer) return;

        switch (gameType) {
            case 'quiz':
                this.renderQuizGame(gameContainer, gameData);
                break;
            case 'match':
                this.renderMatchGame(gameContainer, gameData);
                break;
            case 'truefalse':
                this.renderTrueFalseGame(gameContainer, gameData);
                break;
            default:
                gameContainer.innerHTML = '<p>Неизвестный тип игры</p>';
        }
    }

    /**
     * Рендерит игру типа Quiz
     */
    renderQuizGame(container, gameData) {
        container.innerHTML = `
            <div class="weekly-question-text">${this.escapeHtml(gameData.question)}</div>
            <div class="weekly-quiz-options">
                ${gameData.options.map((option, index) => `
                    <div class="weekly-quiz-option" data-index="${index}">
                        ${this.escapeHtml(option)}
                    </div>
                `).join('')}
            </div>
        `;

        // Обработчики для опций
        document.querySelectorAll('.weekly-quiz-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.currentTarget.dataset.index);
                const isCorrect = selectedIndex === gameData.correctIndex;

                // Показываем правильный ответ при неправильном выборе
                if (!isCorrect) {
                    document.querySelectorAll('.weekly-quiz-option')[gameData.correctIndex].classList.add('correct');
                }

                this.handleGameComplete(isCorrect, e.currentTarget, gameData);
            });
        });
    }

    /**
     * Рендерит игру типа Match
     */
    renderMatchGame(container, gameData) {
        // Проверка наличия пар
        if (!gameData.pairs || gameData.pairs.length === 0) {
            container.innerHTML = '<p>Нет доступных пар для игры</p>';
            return;
        }

        // Создаем массивы для левой и правой колонок
        const leftItems = gameData.pairs.map((pair, index) => ({
            ...pair,
            originalIndex: index
        }));

        const rightItems = [...gameData.pairs].map((pair, index) => ({
            ...pair,
            originalIndex: index
        }));

        // Перемешиваем правую колонку
        for (let i = rightItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
        }

        container.innerHTML = `
            <div class="weekly-question-text">Соедини пары:</div>
            <div class="match-game-container">
                <div class="match-column">
                    ${leftItems.map((item, index) => `
                        <div class="match-item left" data-index="${item.originalIndex}">
                            ${this.escapeHtml(item.left)}
                        </div>
                    `).join('')}
                </div>
                <div class="match-column">
                    ${rightItems.map((item, index) => `
                        <div class="match-item right" data-index="${item.originalIndex}">
                            ${this.escapeHtml(item.right)}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="match-comparison-area" id="matchComparisonArea" style="display: none;">
                <div class="comparison-label">Сравнить:</div>
                <div class="comparison-items">
                    <div class="comparison-item" id="comparisonLeft"></div>
                    <div class="comparison-divider">⟷</div>
                    <div class="comparison-item" id="comparisonRight"></div>
                </div>
                <button class="btn btn-confirm" id="confirmMatchBtn">✓ Подтвердить пару</button>
                <button class="btn btn-cancel" id="cancelMatchBtn">✗ Отменить</button>
            </div>
            <button class="btn" id="checkMatchBtn" style="width: 100%; margin-top: 15px;">
                Проверить (${0}/${gameData.pairs.length})
            </button>
        `;

        // Логика для соединения пар
        let selectedLeft = null;
        let selectedRight = null;
        let matches = [];

        const updateCheckButton = () => {
            const btn = document.getElementById('checkMatchBtn');
            if (btn) {
                btn.textContent = `Проверить (${matches.length}/${gameData.pairs.length})`;
                btn.disabled = matches.length !== gameData.pairs.length;
            }
        };

        const showComparison = () => {
            const comparisonArea = document.getElementById('matchComparisonArea');
            const leftText = document.getElementById('comparisonLeft');
            const rightText = document.getElementById('comparisonRight');

            if (selectedLeft && selectedRight) {
                leftText.textContent = selectedLeft.textContent;
                rightText.textContent = selectedRight.textContent;
                comparisonArea.style.display = 'block';
            }
        };

        const hideComparison = () => {
            const comparisonArea = document.getElementById('matchComparisonArea');
            comparisonArea.style.display = 'none';

            if (selectedLeft) {
                selectedLeft.classList.remove('selected');
                selectedLeft = null;
            }
            if (selectedRight) {
                selectedRight.classList.remove('selected');
                selectedRight = null;
            }
        };

        // Используем container для поиска элементов, чтобы избежать конфликтов
        const leftElements = container.querySelectorAll('.match-item.left');
        const rightElements = container.querySelectorAll('.match-item.right');

        leftElements.forEach(item => {
            item.addEventListener('click', function() {
                // Если элемент уже сопоставлен, не даём его выбрать
                if (this.classList.contains('matched')) return;

                leftElements.forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedLeft = this;

                // Если уже выбран правый элемент, показываем сравнение
                if (selectedRight) {
                    showComparison();
                } else {
                    hideComparison();
                }
            });
        });

        rightElements.forEach(item => {
            item.addEventListener('click', function() {
                // Если элемент уже сопоставлен, не даём его выбрать
                if (this.classList.contains('matched')) return;

                if (!selectedLeft) {
                    // Подсветка: нужно сначала выбрать слева
                    leftElements.forEach(el => el.classList.add('hint-pulse'));
                    setTimeout(() => {
                        leftElements.forEach(el => el.classList.remove('hint-pulse'));
                    }, 1000);
                    return;
                }

                rightElements.forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedRight = this;

                showComparison();
            });
        });

        // Кнопка подтверждения пары
        const confirmBtn = document.getElementById('confirmMatchBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (!selectedLeft || !selectedRight) return;

                const leftIndex = selectedLeft.dataset.index;
                const rightIndex = selectedRight.dataset.index;

                // Удаляем старое сопоставление, если было
                matches = matches.filter(m => m.left !== leftIndex && m.right !== rightIndex);

                // Добавляем новое
                matches.push({ left: leftIndex, right: rightIndex });

                selectedLeft.classList.add('matched');
                selectedRight.classList.add('matched');

                hideComparison();
                updateCheckButton();
            });
        }

        // Кнопка отмены
        const cancelBtn = document.getElementById('cancelMatchBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideComparison();
            });
        }

        // Кнопка проверки
        const checkBtn = document.getElementById('checkMatchBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                if (matches.length !== gameData.pairs.length) {
                    alert('Соедините все пары!');
                    return;
                }

                // Проверяем правильность
                const correctMatches = matches.filter(m => m.left === m.right).length;
                const isCorrect = correctMatches === gameData.pairs.length;

                // Показываем правильные/неправильные пары
                matches.forEach(match => {
                    const leftEl = container.querySelector(`.match-item.left[data-index="${match.left}"]`);
                    const rightEl = container.querySelector(`.match-item.right[data-index="${match.right}"]`);

                    if (leftEl && rightEl) {
                        if (match.left === match.right) {
                            leftEl.classList.add('correct');
                            rightEl.classList.add('correct');
                        } else {
                            leftEl.classList.add('incorrect');
                            rightEl.classList.add('incorrect');
                        }
                    }
                });

                this.handleGameComplete(isCorrect, checkBtn, gameData);
            });
        }

        updateCheckButton();
    }

    /**
     * Рендерит игру типа True/False
     */
    renderTrueFalseGame(container, gameData) {
        // Теперь gameData.question содержит один конкретный вопрос
        const question = gameData.question;

        if (!question) {
            container.innerHTML = '<p>Нет доступного вопроса</p>';
            return;
        }

        container.innerHTML = `
            <div class="weekly-question-text">${this.escapeHtml(question.statement)}</div>
            <div class="truefalse-buttons">
                <button class="truefalse-btn true-btn" data-answer="true">
                    ✓ Правда
                </button>
                <button class="truefalse-btn false-btn" data-answer="false">
                    ✗ Ложь
                </button>
            </div>
            ${question.explanation ? `
                <div class="truefalse-explanation" style="display: none; margin-top: 20px; padding: 15px; background: #f5f7fa; border-radius: 10px;">
                    <strong>💡 Объяснение:</strong><br>
                    ${this.escapeHtml(question.explanation)}
                </div>
            ` : ''}
        `;

        document.querySelectorAll('.truefalse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const answer = e.currentTarget.dataset.answer === 'true';
                const isCorrect = answer === question.correct;

                // Показываем правильный ответ
                const correctBtn = document.querySelector(`.truefalse-btn.${question.correct ? 'true' : 'false'}-btn`);
                if (correctBtn && !isCorrect) {
                    correctBtn.classList.add('correct');
                }

                // Показываем объяснение
                const explanation = document.querySelector('.truefalse-explanation');
                if (explanation) {
                    explanation.style.display = 'block';
                }

                this.handleGameComplete(isCorrect, e.currentTarget, gameData);
            });
        });
    }

    /**
     * Обработчик завершения игры
     */
    handleGameComplete(isCorrect, element, gameData) {
        // Останавливаем таймер
        this.stopTimer();

        // Воспроизводим звук
        if (this.soundManager) {
            if (isCorrect) {
                this.soundManager.playCorrectSound();
            } else {
                this.soundManager.playIncorrectSound();
            }
        }

        // Отключаем все интерактивные элементы
        if (element) {
            const parent = element.closest('#weeklyGameContainer');
            if (parent) {
                parent.querySelectorAll('.weekly-quiz-option, .truefalse-btn, .match-item, button').forEach(el => {
                    el.style.pointerEvents = 'none';
                });
            }
        }

        // Показываем визуальную обратную связь
        if (element) {
            if (isCorrect) {
                element.classList.add('correct');
            } else {
                element.classList.add('incorrect');
            }
        }

        if (isCorrect) {
            this.score++;
        }

        this.answers.push({
            gameIndex: this.currentQuestionIndex,
            correct: isCorrect
        });

        // Показываем кнопку "Далее"
        const navContainer = document.getElementById('weeklyQuizNav');
        if (navContainer) {
            navContainer.style.display = 'flex';
            const nextBtn = document.getElementById('weeklyQuizNextBtn');
            if (nextBtn) {
                nextBtn.onclick = () => this.nextGame();
            }
        }
    }

    /**
     * Переход к следующей игре
     */
    nextGame() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.currentQuiz.gamesCount) {
            this.showResults();
        } else {
            this.renderCurrentGame();
        }
    }

    /**
     * Обновляет прогресс-бар
     */
    updateProgress() {
        const progressFill = document.getElementById('weeklyQuizProgressFill');
        const gameNum = document.getElementById('currentQuestionNum');

        if (progressFill) {
            const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.gamesCount) * 100;
            progressFill.style.width = `${progress}%`;
        }

        if (gameNum) {
            gameNum.textContent = this.currentQuestionIndex + 1;
        }
    }

    /**
     * Показывает результаты
     */
    showResults() {
        // Останавливаем таймер если он еще работает
        this.stopTimer();

        const container = document.getElementById('weeklyQuizQuestionContainer');
        if (!container) return;

        const percentage = Math.round((this.score / this.currentQuiz.gamesCount) * 100);
        const passed = percentage >= 70;
        const bonusEarned = passed && !this.isWeeklyQuizCompleted(this.currentQuiz.sectionId);

        // Воспроизводим звук завершения
        if (passed && this.soundManager) {
            this.soundManager.playCompleteSound();
        }

        container.innerHTML = `
            <div class="weekly-quiz-results">
                <div class="weekly-quiz-results-icon">${passed ? '🎉' : '📚'}</div>
                <h2>${passed ? 'Отлично!' : 'Попробуй ещё раз!'}</h2>
                <div class="weekly-quiz-results-score">
                    Правильных ответов: ${this.score} из ${this.currentQuiz.gamesCount} (${percentage}%)
                </div>
                ${bonusEarned ? `
                    <div class="weekly-quiz-results-bonus">
                        <h3>🌟 Бонус получен!</h3>
                        <div class="bonus-amount">+${this.currentQuiz.bonusPoints}</div>
                        <p>Бонусные баллы добавлены к вашему счёту!</p>
                    </div>
                ` : ''}
                ${!passed ? `
                    <p style="color: #666; margin: 20px 0;">
                        Для получения бонуса нужно правильно ответить минимум на 70% вопросов.
                    </p>
                ` : ''}
                ${this.isWeeklyQuizCompleted(this.currentQuiz.sectionId) && passed ? `
                    <p style="color: #ff9800; margin: 20px 0;">
                        Вы уже проходили эту викторину на этой неделе. Баллы не засчитаны.
                    </p>
                ` : ''}
                <button class="btn" onclick="window.chitasApp.weeklyTrivia.backToSelection()">
                    ← Вернуться к выбору
                </button>
            </div>
        `;

        // Сохраняем результаты
        if (bonusEarned) {
            this.saveResults();
        }

        // Конфетти при успехе
        if (passed && typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    /**
     * Сохраняет результаты викторины
     */
    saveResults() {
        const weekKey = this.getWeekKey();

        if (!this.app.state.weeklyTrivia) {
            this.app.state.weeklyTrivia = {};
        }

        if (!this.app.state.weeklyTrivia[weekKey]) {
            this.app.state.weeklyTrivia[weekKey] = {};
        }

        this.app.state.weeklyTrivia[weekKey][this.currentQuiz.sectionId] = true;

        // Добавляем бонусные баллы
        this.app.state.score += this.currentQuiz.bonusPoints;
        this.app.state.stars += 10;

        this.app.saveProgress();
        this.app.updateProgress();
        this.app.achievementsManager.updateAchievements();
    }

    /**
     * Возврат к выбору разделов
     */
    backToSelection() {
        this.currentQuiz = null;
        this.currentSection = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];

        const container = document.getElementById('weeklyTriviaContent');
        if (container) {
            container.innerHTML = `
                <div class="weekly-trivia-sections">
                    <!-- Section selection cards will be rendered here -->
                </div>
            `;
        }

        this.renderSectionSelection();
    }

    /**
     * Применяет фильтр типов игр
     */
    applyGameTypeFilter() {
        this.gameTypeFilter.quiz = document.getElementById('filterQuiz')?.checked || false;
        this.gameTypeFilter.match = document.getElementById('filterMatch')?.checked || false;
        this.gameTypeFilter.truefalse = document.getElementById('filterTrueFalse')?.checked || false;

        // Проверяем, что выбран хотя бы один тип
        if (!this.gameTypeFilter.quiz && !this.gameTypeFilter.match && !this.gameTypeFilter.truefalse) {
            alert('Выберите хотя бы один тип игры!');
            return;
        }

        // Перезагружаем викторины
        this.init();
    }

    /**
     * Экранирование HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Инициализация при открытии view
     */
    async init() {
        console.log('Инициализация Weekly Trivia...');

        const container = document.getElementById('weeklyTriviaContent');
        if (container) {
            container.innerHTML = `
                ${this.renderGameTypeFilter()}
                <div class="weekly-trivia-sections">
                    <div class="loading">Загрузка викторин...</div>
                </div>
            `;

            // Обработчик для кнопки применения фильтра
            document.getElementById('applyGameFilter')?.addEventListener('click', () => {
                this.applyGameTypeFilter();
            });
        }

        await this.loadAllWeeklyQuizzes();
        this.renderSectionSelection();
    }
}

// Экспорт для использования в app.js
if (typeof window !== 'undefined') {
    window.WeeklyTriviaManager = WeeklyTriviaManager;
}
