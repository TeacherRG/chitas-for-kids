/**
 * Weekly Trivia Manager - Недельная викторина с бонусными баллами
 * Собирает quiz из последних 6 дней по всем разделам
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

class WeeklyTriviaManager {
    constructor(chitasApp) {
        this.app = chitasApp;
        this.currentQuiz = null;
        this.currentSection = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];
        this.weeklyQuizzes = {};
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
     * Загружает недельную викторину для указанного раздела
     */
    async loadWeeklyQuiz(sectionId) {
        const section = TRIVIA_SECTIONS_CONFIG[sectionId];
        if (!section) {
            console.error(`Неизвестный раздел: ${sectionId}`);
            return null;
        }

        const filePaths = this.getLastNDaysFilePaths(6);
        const questions = [];

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
                const quiz = sectionGames.find(game => game.type === "quiz");

                if (!quiz) {
                    console.warn(`Quiz не найден в разделе ${sectionId} файла: ${filename}`);
                    continue;
                }

                const dayName = this.getDayNameFromDate(gamesData.date);

                questions.push({
                    day: dayName,
                    date: gamesData.date,
                    question: quiz.question,
                    options: quiz.options,
                    correctIndex: quiz.correctIndex,
                    explanation: quiz.explanation
                });

            } catch (error) {
                console.error(`Ошибка при обработке файла ${filename}:`, error);
                continue;
            }
        }

        questions.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            type: "weekly-quiz",
            sectionId: sectionId,
            title: `🎯 Недельная викторина - ${section.title}`,
            category: sectionId,
            color: section.color,
            icon: section.icon,
            bonusPoints: section.bonusPoints,
            questionsCount: questions.length,
            questions: questions
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
                if (quiz && quiz.questions.length > 0) {
                    this.weeklyQuizzes[sectionId] = quiz;
                }
            } catch (error) {
                console.error(`Не удалось загрузить викторину для ${sectionId}:`, error);
            }
        }

        return this.weeklyQuizzes;
    }

    /**
     * Рендерит список разделов для выбора
     */
    renderSectionSelection() {
        const container = document.querySelector('.weekly-trivia-sections');
        if (!container) return;

        container.innerHTML = '';

        Object.values(this.weeklyQuizzes).forEach(quiz => {
            if (!quiz || quiz.questions.length === 0) return;

            const isCompleted = this.isWeeklyQuizCompleted(quiz.sectionId);

            const card = document.createElement('div');
            card.className = `trivia-section-card ${isCompleted ? 'completed' : ''}`;
            card.style.setProperty('--section-color', quiz.color);

            card.innerHTML = `
                <div class="trivia-section-icon">${quiz.icon}</div>
                <div class="trivia-section-title">${quiz.title}</div>
                <div class="trivia-section-info">
                    <span class="trivia-questions-count">📝 ${quiz.questionsCount} вопросов</span>
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
                            Вопрос <span id="currentQuestionNum">1</span> из ${this.currentQuiz.questionsCount}
                        </div>
                    </div>
                </div>
                <div id="weeklyQuizQuestionContainer"></div>
            </div>
        `;

        this.renderQuestion();
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
     * Рендерит вопрос
     */
    renderQuestion() {
        const container = document.getElementById('weeklyQuizQuestionContainer');
        if (!container) return;

        const question = this.currentQuiz.questions[this.currentQuestionIndex];

        container.innerHTML = `
            <div class="weekly-question-card">
                <div class="weekly-question-day" style="background: ${this.currentSection.color};">
                    ${question.day}
                </div>
                <div class="weekly-question-text">${this.escapeHtml(question.question)}</div>
                <div class="weekly-quiz-options" id="weeklyQuizOptions">
                    ${question.options.map((option, index) => `
                        <div class="weekly-quiz-option" data-index="${index}">
                            ${this.escapeHtml(option)}
                        </div>
                    `).join('')}
                </div>
                <div class="weekly-quiz-nav">
                    <button class="btn" id="weeklyQuizNextBtn" disabled>Далее ▶</button>
                </div>
            </div>
        `;

        // Обработчики для опций
        document.querySelectorAll('.weekly-quiz-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleOptionClick(e));
        });

        // Обновляем прогресс
        this.updateProgress();
    }

    /**
     * Обработчик клика по опции
     */
    handleOptionClick(e) {
        const selectedOption = e.currentTarget;
        const selectedIndex = parseInt(selectedOption.dataset.index);
        const question = this.currentQuiz.questions[this.currentQuestionIndex];

        // Убираем обработчики с других опций
        document.querySelectorAll('.weekly-quiz-option').forEach(opt => {
            opt.style.pointerEvents = 'none';
        });

        // Проверяем ответ
        const isCorrect = selectedIndex === question.correctIndex;

        if (isCorrect) {
            selectedOption.classList.add('correct');
            this.score++;
        } else {
            selectedOption.classList.add('incorrect');
            // Показываем правильный ответ
            document.querySelectorAll('.weekly-quiz-option')[question.correctIndex].classList.add('correct');
        }

        this.answers.push({
            questionIndex: this.currentQuestionIndex,
            selectedIndex: selectedIndex,
            correct: isCorrect
        });

        // Включаем кнопку "Далее"
        const nextBtn = document.getElementById('weeklyQuizNextBtn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.onclick = () => this.nextQuestion();
        }
    }

    /**
     * Переход к следующему вопросу
     */
    nextQuestion() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.currentQuiz.questionsCount) {
            this.showResults();
        } else {
            this.renderQuestion();
        }
    }

    /**
     * Обновляет прогресс-бар
     */
    updateProgress() {
        const progressFill = document.getElementById('weeklyQuizProgressFill');
        const questionNum = document.getElementById('currentQuestionNum');

        if (progressFill) {
            const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.questionsCount) * 100;
            progressFill.style.width = `${progress}%`;
        }

        if (questionNum) {
            questionNum.textContent = this.currentQuestionIndex + 1;
        }
    }

    /**
     * Показывает результаты
     */
    showResults() {
        const container = document.getElementById('weeklyQuizQuestionContainer');
        if (!container) return;

        const percentage = Math.round((this.score / this.currentQuiz.questionsCount) * 100);
        const passed = percentage >= 70;
        const bonusEarned = passed && !this.isWeeklyQuizCompleted(this.currentQuiz.sectionId);

        container.innerHTML = `
            <div class="weekly-quiz-results">
                <div class="weekly-quiz-results-icon">${passed ? '🎉' : '📚'}</div>
                <h2>${passed ? 'Отлично!' : 'Попробуй ещё раз!'}</h2>
                <div class="weekly-quiz-results-score">
                    Правильных ответов: ${this.score} из ${this.currentQuiz.questionsCount} (${percentage}%)
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
        this.app.state.stars += 10; // Дополнительные звёзды за недельную викторину

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
        await this.loadAllWeeklyQuizzes();
        this.renderSectionSelection();
    }
}

// Экспорт для использования в app.js
if (typeof window !== 'undefined') {
    window.WeeklyTriviaManager = WeeklyTriviaManager;
}
