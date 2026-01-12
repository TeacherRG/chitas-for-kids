 /**
 * ХИТАС ДЛЯ ДЕТЕЙ - APPLICATION (FIXED)
 */

'use strict';

const CONFIG = {
    DATA_PATH: 'data/',
    STORAGE_KEY: 'chitasProgress',
    SPEECH_LANG: 'ru-RU',
    SPEECH_RATE: 0.9
};

/**
 * GameFactory - Manages game type registration and instantiation
 * Replaces the switch statement with a cleaner registry pattern
 */
class GameFactory {
    constructor() {
        this.gameTypes = new Map();
        this.registerDefaultGameTypes();
    }

    registerDefaultGameTypes() {
        // Register all available game types
        this.register('quiz', QuizGame);
        this.register('truefalse', TrueFalseGame);
        this.register('match', MatchGame);
        this.register('reflection', ReflectionGame);
        this.register('wheel', WheelGame);
    }

    register(type, GameClass) {
        this.gameTypes.set(type, GameClass);
    }

    create(gameData, container, onComplete) {
        const GameClass = this.gameTypes.get(gameData.type);

        if (!GameClass) {
            console.warn(`Unknown game type: ${gameData.type}`);
            return null;
        }

        return new GameClass(gameData, container, onComplete);
    }

    hasGameType(type) {
        return this.gameTypes.has(type);
    }
}

class ChitasApp {
    constructor() {
        this.contentData = null;
        this.gamesData = null;
        this.currentDate = this.getTodayDate();
        this.currentSection = null;
        this.state = this.loadProgress();
        this.speechSynthesis = window.speechSynthesis;
        this.isPlaying = false;
        this.isPaused = false;
        this.gameInstances = new Map(); // Use Map instead of object for better key management
        this.gameFactory = new GameFactory();

        // TEMPORARY: Store available dates from index for navigation control
        this.availableDates = null;
        this.dateIndex = null;

        // Инициализируем менеджер достижений
        this.achievementsManager = new AchievementsManager(this);

        // Инициализируем менеджер печати
        this.printManager = new PrintManager(this);

        // Инициализируем менеджер недельной триvia
        this.weeklyTrivia = new WeeklyTriviaManager(this);

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.applySettings();

        // Загружаем индекс для определения доступных дат
        await this.loadIndex();

        // Определяем начальную дату только если нет параметра в URL
        const url = new URL(window.location.href);
        const dateParam = url.searchParams.get('date');

        if (!dateParam) {
            // Ищем ближайшую доступную дату
            const nearestDate = this.findNearestAvailableDate(this.formatDate(new Date()));
            if (nearestDate) {
                this.currentDate = nearestDate;
                this.updateURL();
            }
        }

        this.loadData();
    }

    setupEventListeners() {
        this.addClickHandler('prevDayBtn', () => this.navigateDate(-1));
        this.addClickHandler('todayBtn', () => this.navigateToToday());
        this.addClickHandler('nextDayBtn', () => this.navigateDate(1));
        this.addClickHandler('closeSectionBtn', () => this.closeSection());
        this.addClickHandler('speakBtn', () => this.speakContent());
        this.addClickHandler('resetBtn', () => this.resetProgress());
        this.addClickHandler('printBtn', () => this.printPage());

        // Новые обработчики для функции "Поделиться"
        this.addClickHandler('shareWhatsAppBtn', () => this.achievementsManager.shareProgress('whatsapp'));
        this.addClickHandler('shareTelegramBtn', () => this.achievementsManager.shareProgress('telegram'));

        // Обработчики для синхронизации с Firebase
        this.addClickHandler('syncProgressBtn', () => this.achievementsManager.syncToFirebase());
        this.addClickHandler('loadProgressBtn', () => this.achievementsManager.loadFromFirebase());

        // Обработчики для меню помощи
        this.addClickHandler('contactEmailBtn', () => window.location.href = 'mailto:office@mychitas.app');
        this.addClickHandler('shareAppBtn', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText('www.mychitas.app');
                alert('Ссылка скопирована! Поделитесь с друзьями.');
            } else {
                alert('Поделитесь с друзьями: www.mychitas.app');
            }
        });

        // Обработчики для информационных секций помощи
        document.querySelectorAll('[data-help-section]').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.helpSection;
                if (section === 'about') this.switchView('aboutView');
                if (section === 'howto') this.switchView('howtoView');
                if (section === 'privacy') this.switchView('privacyView');
            });
        });

        // Кнопки "Назад" для возврата в helpView
        this.addClickHandler('backToHelpFromAbout', () => this.switchView('helpView'));
        this.addClickHandler('backToHelpFromHowto', () => this.switchView('helpView'));
        this.addClickHandler('backToHelpFromPrivacy', () => this.switchView('helpView'));

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.view) {
                    this.switchView(item.dataset.view);
                }
            });
        });

        document.querySelectorAll('.setting-item[data-setting]').forEach(item => {
            item.addEventListener('click', () => {
                this.toggleSetting(item.dataset.setting);
            });
        });

        window.addEventListener('popstate', () => {
            this.currentDate = this.getTodayDate();
            this.loadData();
        });
    }

    addClickHandler(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) element.addEventListener('click', handler);
    }

    getTodayDate() {
        const url = new URL(window.location.href);
        const dateParam = url.searchParams.get('date');
        if (dateParam && this.isValidDate(dateParam)) return dateParam;
        return this.formatDate(new Date());
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    navigateDate(delta) {
        const current = new Date(this.currentDate);
        current.setDate(current.getDate() + delta);
        this.currentDate = this.formatDate(current);
        this.updateURL();
        this.loadData();
    }

    navigateToToday() {
        this.currentDate = this.formatDate(new Date());
        this.updateURL();
        this.loadData();
    }

    updateURL() {
        const url = new URL(window.location.href);
        url.searchParams.set('date', this.currentDate);
        window.history.pushState({}, '', url);
    }

    /**
     * Load index.json to get available dates
     */
    async loadIndex() {
        try {
            const indexResponse = await fetch(`${CONFIG.DATA_PATH}index.json`);
            const index = await indexResponse.json();

            this.dateIndex = index;
            this.availableDates = index.dates.map(d => d.date).sort();
        } catch (error) {
            console.error('Error loading index:', error);
            this.availableDates = [];
            this.dateIndex = null;
        }
    }

    /**
     * Find the nearest available date (current date or earlier)
     */
    findNearestAvailableDate(targetDate) {
        if (!this.availableDates || this.availableDates.length === 0) return null;

        // First, check if target date itself has data
        if (this.availableDates.includes(targetDate)) {
            return targetDate;
        }

        // If not, find the most recent available date before target date
        return this.findPreviousAvailableDate(targetDate);
    }

    /**
     * TEMPORARY: Check if a specific date has available data
     */
    isDateAvailable(dateString) {
        if (!this.availableDates) return false;
        return this.availableDates.includes(dateString);
    }

    /**
     * TEMPORARY: Find the most recent available date before the given date
     */
    findPreviousAvailableDate(dateString) {
        if (!this.availableDates || this.availableDates.length === 0) return null;

        // Filter dates that are before or equal to the given date
        const previousDates = this.availableDates.filter(d => d <= dateString);

        // Return the most recent one (last in sorted array)
        return previousDates.length > 0 ? previousDates[previousDates.length - 1] : null;
    }

    /**
     * TEMPORARY: Find the next available date after the given date
     */
    findNextAvailableDate(dateString) {
        if (!this.availableDates || this.availableDates.length === 0) return null;

        // Filter dates that are after the given date
        const nextDates = this.availableDates.filter(d => d > dateString);

        // Return the earliest one (first in sorted array)
        return nextDates.length > 0 ? nextDates[0] : null;
    }

    /**
     * TEMPORARY: Update navigation buttons state based on available dates
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevDayBtn');
        const nextBtn = document.getElementById('nextDayBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (!prevBtn || !nextBtn || !todayBtn) return;

        // Check if previous day has data
        const prevDate = new Date(this.currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const hasPrevData = this.isDateAvailable(this.formatDate(prevDate));

        // Check if next day has data
        const nextDate = new Date(this.currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const hasNextData = this.isDateAvailable(this.formatDate(nextDate));

        // Check if today has data
        const today = this.formatDate(new Date());
        const hasTodayData = this.isDateAvailable(today);
        const isToday = this.currentDate === today;

        // Update button states
        prevBtn.disabled = !hasPrevData;
        nextBtn.disabled = !hasNextData;
        todayBtn.disabled = !hasTodayData || isToday;

        // Add/remove visual classes for better UX
        prevBtn.classList.toggle('disabled', !hasPrevData);
        nextBtn.classList.toggle('disabled', !hasNextData);
        todayBtn.classList.toggle('disabled', !hasTodayData || isToday);
    }

    async loadData() {
        try {
            // Если индекс еще не загружен, загружаем его
            if (!this.dateIndex || !this.availableDates) {
                await this.loadIndex();
            }

            let dateEntry = this.dateIndex.dates.find(d => d.date === this.currentDate);

            // If current date not found, try to find previous available date
            if (!dateEntry) {
                console.warn('Date not found in index, searching for previous available date');
                const previousDate = this.findPreviousAvailableDate(this.currentDate);

                if (previousDate) {
                    console.log(`Using previous available date: ${previousDate}`);
                    this.currentDate = previousDate;
                    this.updateURL();
                    dateEntry = this.dateIndex.dates.find(d => d.date === this.currentDate);
                } else {
                    console.warn('No previous date available');
                    this.showError('Нет данных для этой даты');
                    this.updateNavigationButtons();
                    return;
                }
            }

            const [contentResponse, gamesResponse] = await Promise.all([
                fetch(`${CONFIG.DATA_PATH}${dateEntry.content}`),
                fetch(`${CONFIG.DATA_PATH}${dateEntry.games}`)
            ]);

            if (contentResponse.ok && gamesResponse.ok) {
                this.contentData = await contentResponse.json();
                this.gamesData = await gamesResponse.json();

                this.mergeData();
                this.renderPage();

                // Update navigation buttons state after loading
                this.updateNavigationButtons();
            } else {
                throw new Error('Failed to load data files');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Ошибка загрузки данных');
        }
    }

    mergeData() {
        if (this.contentData && this.gamesData) {
            this.contentData.sections.forEach(section => {
                const sectionGames = this.gamesData.games[section.id];
                if (sectionGames) {
                    section.games = sectionGames;
                }
            });
        }
    }

    renderPage() {
        this.updateDateDisplay();
        this.renderMazelTov();
        this.renderTiles();
        this.updateProgress();
        this.achievementsManager.updateAchievements();
    }

    updateDateDisplay() {
        this.setTextContent('hebrewDate', this.contentData.hebrewDate);
        this.setTextContent('dedication', this.contentData.dedication);
    }

    renderMazelTov() {
        const container = document.getElementById('mazelTovSection');
        if (!container) return;

        if (!this.contentData.mazalTov || this.contentData.mazalTov.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="mazel-tov-section"><h3>🎉 Мазаль Тов!</h3>';
        this.contentData.mazalTov.forEach(mt => {
            html += `
                <div class="mazel-tov-item">
                    <h4>${this.escapeHtml(mt.name)}</h4>
                    <p>${this.escapeHtml(mt.occasion)}</p>
                    <p><small>${this.escapeHtml(mt.location)}</small></p>
                    <p><em>${this.escapeHtml(mt.blessing)}</em></p>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    renderTiles() {
        const grid = document.getElementById('tilesGrid');
        if (!grid) return;

        if (!this.contentData.sections || this.contentData.sections.length === 0) {
            grid.innerHTML = '<div class="loading">Нет данных для отображения</div>';
            return;
        }

        grid.innerHTML = '';
        this.contentData.sections.forEach(section => {
            const tile = this.createTile(section);
            grid.appendChild(tile);
        });
    }

    createTile(section) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.category = section.category;
        tile.style.setProperty('color', section.color);

        // Section is considered completed if at least one game is completed
        const isCompleted = this.isSectionPartiallyCompleted(section.id);
        const preview = this.getPreviewText(section);

        tile.innerHTML = `
            <div class="tile-header">
                <div class="tile-icon">${section.icon}</div>
                <div class="tile-title-group">
                    <div class="tile-title">${this.escapeHtml(section.title)}</div>
                    <div class="tile-subtitle">${this.escapeHtml(section.subtitle)}</div>
                </div>
            </div>
            <div class="tile-preview">${this.escapeHtml(preview)}</div>
            <div class="tile-footer">
                <div class="tile-points">+${section.points} баллов</div>
                <div class="tile-status ${isCompleted ? 'completed' : 'pending'}">
                    ${isCompleted ? '✅ Пройдено' : '⏳ Не пройдено'}
                </div>
            </div>
        `;

        tile.addEventListener('click', () => this.openSection(section.id));
        return tile;
    }

    getPreviewText(section) {
        if (!section.content || !section.content.paragraphs) return '';
        const firstText = section.content.paragraphs.find(p => p.type === 'text');
        return firstText ? firstText.text.substring(0, 120) + '...' : '';
    }

    async openSection(sectionId) {
        const section = this.contentData.sections.find(s => s.id === sectionId);
        if (!section) return;

        this.currentSection = section;
        document.body.classList.add('section-open');

        const sectionView = document.getElementById('sectionView');
        sectionView.classList.add('active');

        this.setTextContent('sectionTitle', section.title);

        await this.renderSectionContent(section);

        // Обновляем иконку кнопки озвучки в зависимости от доступности RV
        this.updateSpeakButtonStatus();

        window.scrollTo(0, 0);
    }

    closeSection() {
        document.body.classList.remove('section-open');
        const sectionView = document.getElementById('sectionView');
        sectionView.classList.remove('active');
        this.currentSection = null;
        this.gameInstances.clear(); // Clear Map entries instead of reassigning

        // Останавливаем озвучивание
        if (window.responsiveVoice && responsiveVoice.isPlaying()) {
            responsiveVoice.cancel();
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.isPlaying = false;
        this.isPaused = false;

        // Сбрасываем иконку кнопки
        const speakBtn = document.getElementById('speakBtn');
        if (speakBtn) speakBtn.innerHTML = "🔊";
    }

    async renderSectionContent(section) {
        const container = document.getElementById('sectionContent');
        if (!container) return;

        let html = '';

        if (section.content.title) {
            html += `<h2 class="content-title">${this.escapeHtml(section.content.title)}</h2>`;
        }

        for (const para of section.content.paragraphs) {
            html += await this.renderParagraph(para);
        }

        html += await this.renderGamesContainer(section);

        container.innerHTML = html;
        await this.initializeGames(section);
    }

    async renderParagraph(para) {
        const classList = ['content-paragraph', para.type].filter(Boolean).join(' ');
        let content = '';

        if (para.title) {
            content += `<div class="paragraph-title">${this.escapeHtml(para.title)}</div>`;
        }

        content += this.escapeHtml(para.text);

        return `<div class="${classList}">${content}</div>`;
    }

    async renderGamesContainer(section) {
        if (!section.games || section.games.length === 0) return '';

        const isPartiallyCompleted = this.isSectionPartiallyCompleted(section.id);
        const isFullyCompleted = this.isSectionCompleted(section.id);
        let html = '<div class="game-container">';

        if (section.games.length > 1) {
            // Определяем статус для заголовка
            let statusText = 'Выбери игру!';
            if (isFullyCompleted) {
                statusText = 'Все игры пройдены! ✅';
            } else if (isPartiallyCompleted) {
                statusText = 'Продолжай играть! 🎯';
            }

            html += `
                <div class="game-menu" id="gameMenu">
                    <h3>🎮 ${statusText}</h3>
                    <div class="game-buttons">
            `;

            for (let index = 0; index < section.games.length; index++) {
                const game = section.games[index];
                const isGameCompleted = this.isGameCompleted(section.id, index);
                const completedClass = isGameCompleted ? 'completed-game' : '';
                const completedIcon = isGameCompleted ? '✅' : this.getGameIcon(game.type);
                html += `<button class="game-button ${completedClass}" data-game-index="${index}">${completedIcon} ${this.escapeHtml(game.title)}</button>`;
            }
            html += '</div></div>';
        } else if (section.games.length === 1 && this.isGameCompleted(section.id, 0)) {
            // Для одиночной игры, если игра пройдена, показываем сообщение сразу
            html += `
                <div class="game-completed-message" style="
                    text-align: center;
                    padding: 40px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 15px;
                    color: white;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    margin-top: 20px;
                ">
                    <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                    <h3 style="font-size: 24px; margin-bottom: 15px; color: white;">Вы уже прошли эту игру!</h3>
                    <p style="font-size: 16px; opacity: 0.9; margin-bottom: 20px;">
                        Отличная работа! Вы уже заработали баллы за эту игру.
                    </p>
                    <p style="font-size: 14px; opacity: 0.8;">
                        Попробуйте другие разделы, чтобы заработать больше баллов!
                    </p>
                </div>
            `;
        }

        section.games.forEach((game, index) => {
            html += `<div class="game-wrapper" data-game-index="${index}"></div>`;
        });

        html += '</div>';
        return html;
    }

    getGameIcon(type) {
        const icons = {
            quiz: '🎯',
            truefalse: '✓',
            match: '🔗',
            reflection: '🤔',
            wheel: '🎡'
        };
        return icons[type] || '🎮';
    }

    /**
     * Helper method to create consistent game instance keys
     */
    getGameKey(sectionId, gameIndex) {
        return `${sectionId}-${gameIndex}`;
    }

    /**
     * Initialize games for a section using the GameFactory pattern
     * Cleaner and more maintainable than the original switch statement
     */
    async initializeGames(section) {
        if (!section.games) return;

        // Инициализируем все игры параллельно
        const promises = section.games.map((gameData, index) =>
            this.initializeSingleGame(section, gameData, index)
        );
        await Promise.all(promises);

        this.setupGameButtons(section);
    }

    /**
     * Initialize a single game instance
     */
    async initializeSingleGame(section, gameData, index) {
        const container = document.querySelector(`.game-wrapper[data-game-index="${index}"]`);
        if (!container) return;

        const onComplete = (success) => {
            if (success) this.addScore(section.points, section.id, index);
        };

        const gameInstance = this.gameFactory.create(gameData, container, onComplete);

        if (!gameInstance) return; // Factory returns null for unknown game types

        const gameKey = this.getGameKey(section.id, index);
        this.gameInstances.set(gameKey, gameInstance);

        // Don't auto-render - user must select from menu
    }

    /**
     * Setup event listeners for game selection buttons
     */
    setupGameButtons(section) {
        // Удаляем старые обработчики, чтобы избежать дубликатов
        document.querySelectorAll('.game-button').forEach(btn => {
            // Клонируем элемент, чтобы удалить все обработчики событий
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Теперь добавляем новые обработчики
        document.querySelectorAll('.game-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameIndex = parseInt(e.target.dataset.gameIndex);
                this.showGame(section, gameIndex);
            });
        });
    }

    showGame(section, gameIndex) {
        // Проверяем, не пройдена ли уже эта конкретная игра
        if (this.isGameCompleted(section.id, gameIndex)) {
            // Показываем сообщение вместо игры
            this.showCompletedMessage(section, gameIndex);
            return;
        }

        // Clear all game wrappers
        document.querySelectorAll('.game-wrapper').forEach(wrapper => {
            wrapper.innerHTML = '';
        });

        const container = document.querySelector(`.game-wrapper[data-game-index="${gameIndex}"]`);
        const gameKey = this.getGameKey(section.id, gameIndex);
        const gameInstance = this.gameInstances.get(gameKey);

        if (container && gameInstance) {
            gameInstance.render();
        }

        // Keep game menu visible - don't hide it
    }

    showCompletedMessage(section, gameIndex) {
        // Clear all game wrappers
        document.querySelectorAll('.game-wrapper').forEach(wrapper => {
            wrapper.innerHTML = '';
        });

        const container = document.querySelector(`.game-wrapper[data-game-index="${gameIndex}"]`);
        if (!container) return;

        container.innerHTML = `
            <div class="game-completed-message" style="
                text-align: center;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                color: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h3 style="font-size: 24px; margin-bottom: 15px; color: white;">Вы уже прошли эту игру!</h3>
                <p style="font-size: 16px; opacity: 0.9; margin-bottom: 20px;">
                    Отличная работа! Вы уже заработали баллы за эту игру.
                </p>
                <p style="font-size: 14px; opacity: 0.8;">
                    Попробуйте другие игры в этой секции или другие разделы!
                </p>
            </div>
        `;
    }

    /**
     * Check if a specific game is completed
     */
    isGameCompleted(sectionId, gameIndex) {
        const dateKey = this.currentDate;
        const sectionGames = this.state.completed[dateKey]?.[sectionId];

        // Old format compatibility: if sectionGames is boolean (old format), return it
        if (typeof sectionGames === 'boolean') {
            return sectionGames;
        }

        // New format: check specific game
        return sectionGames?.[gameIndex] || false;
    }

    /**
     * Check if at least one game in a section is completed
     */
    isSectionPartiallyCompleted(sectionId) {
        const section = this.contentData?.sections?.find(s => s.id === sectionId);
        if (!section || !section.games || section.games.length === 0) return false;

        // Check if at least one game is completed
        for (let i = 0; i < section.games.length; i++) {
            if (this.isGameCompleted(sectionId, i)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if all games in a section are completed
     */
    isSectionCompleted(sectionId) {
        const section = this.contentData?.sections?.find(s => s.id === sectionId);
        if (!section || !section.games || section.games.length === 0) return false;

        // Check if all games are completed
        for (let i = 0; i < section.games.length; i++) {
            if (!this.isGameCompleted(sectionId, i)) {
                return false;
            }
        }
        return true;
    }

    addScore(points, sectionId, gameIndex) {
        const dateKey = this.currentDate;

        if (!this.state.completed[dateKey]) {
            this.state.completed[dateKey] = {};
        }

        if (!this.state.completed[dateKey][sectionId]) {
            this.state.completed[dateKey][sectionId] = {};
        }

        // Check if this specific game is already completed
        if (!this.state.completed[dateKey][sectionId][gameIndex]) {
            // Calculate points per game (divide section points by number of games)
            const section = this.contentData.sections.find(s => s.id === sectionId);
            const gamesCount = section?.games?.length || 1;
            const pointsPerGame = Math.round(points / gamesCount);

            this.state.score += pointsPerGame;
            this.state.stars += 1;
            this.state.completed[dateKey][sectionId][gameIndex] = true;

            this.saveProgress();
            this.updateProgress();
            this.achievementsManager.updateAchievements();
            this.renderTiles();
        }
    }

    updateProgress() {
        const dateKey = this.currentDate;

        // Count only fully completed sections (all games in section completed)
        let completedCount = 0;
        if (this.contentData && this.contentData.sections) {
            completedCount = this.contentData.sections.filter(section =>
                this.isSectionCompleted(section.id)
            ).length;
        }

        const totalSections = this.contentData?.sections?.length || 0;
        const percentage = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

        this.setTextContent('scoreValue', this.state.score);
        this.setTextContent('starsValue', this.state.stars);
        this.setTextContent('completedValue', `${completedCount}/${totalSections}`);

        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
        }
    }

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // Инициализируем Weekly Trivia при открытии view
        if (viewId === 'weeklyTriviaView') {
            this.weeklyTrivia.init();
        }

        window.scrollTo(0, 0);
    }

    async toggleSetting(setting) {
        // ИСПРАВЛЕНИЕ: правильное переключение состояния
        this.state.settings[setting] = !this.state.settings[setting];

        // Обновляем визуальное состояние переключателя
        const toggleId = setting + 'Toggle';
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            if (this.state.settings[setting]) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }

        // Применяем настройку
        if (setting === 'darkMode') {
            document.body.classList.toggle('dark-mode', this.state.settings[setting]);
        }

        // Обработка push-уведомлений
        if (setting === 'pushNotifications') {
            if (window.handleNotificationToggle) {
                const success = await window.handleNotificationToggle(this.state.settings[setting]);
                if (!success) {
                    // Если не удалось включить уведомления, возвращаем настройку обратно
                    this.state.settings[setting] = false;
                    if (toggle) {
                        toggle.classList.remove('active');
                    }
                }
            }
        }

        this.saveProgress();
        console.log(`Setting ${setting} is now:`, this.state.settings[setting]);
    }

    applySettings() {
        // Применяем сохранённые настройки при загрузке
        Object.keys(this.state.settings).forEach(setting => {
            const toggleId = setting + 'Toggle';
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                if (this.state.settings[setting]) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }

            if (setting === 'darkMode') {
                document.body.classList.toggle('dark-mode', this.state.settings[setting]);
            }
        });
    }

    resetProgress() {
        if (confirm('Вы уверены? Весь прогресс будет удалён!')) {
            this.state = {
                score: 0,
                stars: 0,
                completed: {},
                settings: {
                    sound: true,
                    animations: true,
                    darkMode: false,
                    pushNotifications: true
                }
            };
            this.saveProgress();
            this.applySettings();
            this.updateProgress();
            this.achievementsManager.updateAchievements();
            this.renderTiles();
            alert('✅ Прогресс сброшен!');
        }
    }

    cleanTextForSpeech(text) {
        return text
            // Убираем эмодзи
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
            // Убираем специальные символы (сохраняем только буквы, цифры, пробелы, основные знаки)
            .replace(/[^\u0400-\u04FF\w\s.,!?—–-]/g, ' ')
            // Заменяем двоеточия и точки с запятой на паузы
            .replace(/[:;]/g, ',')
            // Заменяем кавычки на пробелы
            .replace(/[«»""'']/g, ' ')
            // Заменяем тире на паузу
            .replace(/[—–]/g, ' - ')
            // Убираем множественные пробелы
            .replace(/\s+/g, ' ')
            // Убираем пробелы перед знаками препинания
            .replace(/\s+([.,!?])/g, '$1')
            .trim();
    }

    speakContent() {
        if (!this.currentSection) return;

        const speakBtn = document.getElementById('speakBtn');

        // Проверяем, включен ли звук (из audio-reader.js)
        if (typeof soundEnabled !== 'undefined' && !soundEnabled) {
            alert('Звук выключен! Включите звук кнопкой в нижней навигации.');
            return;
        }

        // Собираем текст из параграфов
        const text = this.currentSection.content.paragraphs
            .filter(p => p.text)
            .map(p => p.text)
            .join('. ');

        const cleanText = this.cleanTextForSpeech(text);

        if (!cleanText) {
            alert('Нет текста для озвучивания');
            return;
        }

        // Пытаемся использовать ResponsiveVoice, если доступен
        if (window.responsiveVoice && responsiveVoice.voiceSupport()) {
            this.speakWithResponsiveVoice(cleanText, speakBtn);
        }
        // Fallback на встроенный Web Speech API
        else if (window.speechSynthesis) {
            this.speakWithWebSpeech(cleanText, speakBtn);
        }
        else {
            alert('Озвучивание не поддерживается в вашем браузере');
        }
    }

    async speakWithResponsiveVoice(text, speakBtn) {
        console.log('🎤 Attempting to use ResponsiveVoice');
        console.log('📊 Text length:', text.length);

        // Если уже играет - пауза/возобновление
        if (this.isPlaying) {
            if (this.isPaused) {
                responsiveVoice.resume();
                this.isPaused = false;
                if (speakBtn) speakBtn.innerHTML = "⏸";
                console.log('▶️ Resumed');
            } else {
                responsiveVoice.pause();
                this.isPaused = true;
                if (speakBtn) speakBtn.innerHTML = "▶";
                console.log('⏸ Paused');
            }
            return;
        }

        // Запрашиваем разрешение на воспроизведение аудио
        if (window.requestAudioPermission) {
            try {
                await window.requestAudioPermission();
                console.log('🔓 Аудио разрешения получены');
            } catch (error) {
                console.warn('⚠️ Не удалось получить разрешение на аудио:', error);
            }
        }

        // Проверяем доступные голоса
        const voices = responsiveVoice.getVoices();
        const russianVoice = voices.find(v => v.name === "Russian Female");

        if (!russianVoice) {
            console.warn('⚠️ Russian Female voice not found, available voices:', voices.map(v => v.name));
        } else {
            console.log('✅ Using voice:', russianVoice.name);
        }

        this.isPlaying = true;
        if (speakBtn) speakBtn.innerHTML = "⏸";

        const params = {
            pitch: 1.0,
            rate: 0.9,
            volume: 1.0,
            onstart: () => {
                console.log('✅ ResponsiveVoice speech started');
                if (speakBtn) speakBtn.innerHTML = "⏸";
            },
            onend: () => {
                console.log('✅ ResponsiveVoice speech completed');
                this.isPlaying = false;
                this.isPaused = false;
                if (speakBtn) speakBtn.innerHTML = "🔊";
            },
            onerror: (error) => {
                console.error('❌ ResponsiveVoice error:', error);
                this.isPlaying = false;
                this.isPaused = false;
                if (speakBtn) speakBtn.innerHTML = "🔊";

                // Fallback на Web Speech API при ошибке
                console.log('↩️ Falling back to Web Speech API');
                this.speakWithWebSpeech(text, speakBtn);
            }
        };

        console.log('🔊 Starting speech with ResponsiveVoice...');
        try {
            responsiveVoice.speak(text, "Russian Female", params);
        } catch (error) {
            console.error('❌ Exception when calling responsiveVoice.speak:', error);
            this.isPlaying = false;
            if (speakBtn) speakBtn.innerHTML = "🔊";
            // Fallback
            this.speakWithWebSpeech(text, speakBtn);
        }
    }

    async speakWithWebSpeech(text, speakBtn) {
        console.log('🎤 Using Web Speech API');

        // Если уже играет - останавливаем
        if (this.isPlaying) {
            window.speechSynthesis.cancel();
            this.isPlaying = false;
            if (speakBtn) speakBtn.innerHTML = "🔊";
            return;
        }

        // Запрашиваем разрешение на воспроизведение аудио
        if (window.requestAudioPermission) {
            try {
                await window.requestAudioPermission();
                console.log('🔓 Аудио разрешения получены');
            } catch (error) {
                console.warn('⚠️ Не удалось получить разрешение на аудио:', error);
            }
        }

        this.isPlaying = true;
        if (speakBtn) speakBtn.innerHTML = "⏸";

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            console.log('✅ Web Speech started');
            if (speakBtn) speakBtn.innerHTML = "⏸";
        };

        utterance.onend = () => {
            console.log('✅ Web Speech ended');
            this.isPlaying = false;
            if (speakBtn) speakBtn.innerHTML = "🔊";
        };

        utterance.onerror = (error) => {
            console.error('❌ Web Speech error:', error);
            this.isPlaying = false;
            if (speakBtn) speakBtn.innerHTML = "🔊";
        };

        window.speechSynthesis.speak(utterance);
    }

    updateSpeakButtonStatus() {
        const speakBtn = document.getElementById('speakBtn');
        if (!speakBtn) return;

        // Проверяем доступность ResponsiveVoice
        if (window.responsiveVoice && responsiveVoice.voiceSupport()) {
            console.log('🎤 ResponsiveVoice готов для озвучки');
            speakBtn.title = "Озвучить текст (ResponsiveVoice)";
        } else if (window.speechSynthesis) {
            console.log('🎤 Web Speech API готов для озвучки');
            speakBtn.title = "Озвучить текст (Web Speech API)";
        } else {
            console.warn('⚠️ Озвучка недоступна');
            speakBtn.title = "Озвучка недоступна";
        }
    }

    printPage() {
        this.printManager.print();
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading progress:', e);
        }
        
        return {
            score: 0,
            stars: 0,
            completed: {},
            settings: {
                sound: true,
                animations: true,
                darkMode: false,
                pushNotifications: true
            }
        };
    }

    saveProgress() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
            // Автоматическая синхронизация с Firebase (если пользователь авторизован)
            if (window.authManager && window.authManager.getCurrentUser()) {
                this.achievementsManager.syncToFirebase(true); // silent mode
            }
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    }

    setTextContent(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const grid = document.getElementById('tilesGrid');
        if (grid) {
            grid.innerHTML = `<div class="loading">${this.escapeHtml(message)}</div>`;
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.chitasApp = new ChitasApp();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChitasApp;
}
