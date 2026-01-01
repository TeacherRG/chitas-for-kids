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
        this.gameInstances = new Map(); // Use Map instead of object for better key management
        this.gameFactory = new GameFactory();
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.applySettings();
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
        this.addClickHandler('shareWhatsAppBtn', () => this.shareProgress('whatsapp'));
        this.addClickHandler('shareTelegramBtn', () => this.shareProgress('telegram'));

        // Обработчики для синхронизации с Firebase
        this.addClickHandler('syncProgressBtn', () => this.syncToFirebase());
        this.addClickHandler('loadProgressBtn', () => this.loadFromFirebase());

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

    async loadData() {
        try {
            const indexResponse = await fetch(`${CONFIG.DATA_PATH}index.json`);
            const index = await indexResponse.json();

            const dateEntry = index.dates.find(d => d.date === this.currentDate);

            if (!dateEntry) {
                console.warn('Date not found in index');
                this.showError('Нет данных для этой даты');
                return;
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
        this.updateAchievements();
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
        
        const isCompleted = this.isSectionCompleted(section.id);
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

        window.scrollTo(0, 0);
    }

    closeSection() {
        document.body.classList.remove('section-open');
        const sectionView = document.getElementById('sectionView');
        sectionView.classList.remove('active');
        this.currentSection = null;
        this.gameInstances.clear(); // Clear Map entries instead of reassigning

        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
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

        let html = '<div class="game-container">';

        if (section.games.length > 1) {
            html += `
                <div class="game-menu" id="gameMenu">
                    <h3>🎮 Выбери игру!</h3>
                    <div class="game-buttons">
            `;

            for (let index = 0; index < section.games.length; index++) {
                const game = section.games[index];
                html += `<button class="game-button" data-game-index="${index}">${this.getGameIcon(game.type)} ${this.escapeHtml(game.title)}</button>`;
            }
            html += '</div></div>';
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
            if (success) this.addScore(section.points, section.id);
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
        document.querySelectorAll('.game-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameIndex = parseInt(e.target.dataset.gameIndex);
                this.showGame(section, gameIndex);
            });
        });
    }

    showGame(section, gameIndex) {
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

    isSectionCompleted(sectionId) {
        return this.state.completed[this.currentDate]?.[sectionId] || false;
    }

    addScore(points, sectionId) {
        const dateKey = this.currentDate;
        
        if (!this.state.completed[dateKey]) {
            this.state.completed[dateKey] = {};
        }

        if (!this.state.completed[dateKey][sectionId]) {
            this.state.score += points;
            this.state.stars += 1;
            this.state.completed[dateKey][sectionId] = true;
            
            this.saveProgress();
            this.updateProgress();
            this.updateAchievements();
            this.renderTiles();
        }
    }

    /**
     * Подсчёт текущего стрика (серии дней подряд)
     * КРИТИЧНО для визуализации огонька
     */
    calculateStreak() {
        const completedDates = Object.keys(this.state.completed)
            .filter(date => Object.keys(this.state.completed[date]).length > 0)
            .sort()
            .reverse();

        if (completedDates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < completedDates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const checkDateStr = this.formatDate(checkDate);

            if (completedDates.includes(checkDateStr)) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Определение уровня пользователя
     * 5 уровней: Талмид → Бакки → Ламдан → Рав → Гаон
     */
    calculateLevel() {
        const streak = this.calculateStreak();
        const levels = [
            { name: 'Талмид', icon: '📚', minStreak: 0, color: '#4CAF50' },
            { name: 'Бакки', icon: '📖', minStreak: 7, color: '#2196F3' },
            { name: 'Ламдан', icon: '🎓', minStreak: 21, color: '#9C27B0' },
            { name: 'Рав', icon: '👨‍🏫', minStreak: 50, color: '#FF9800' },
            { name: 'Гаон', icon: '⭐', minStreak: 100, color: '#FFD700' }
        ];

        for (let i = levels.length - 1; i >= 0; i--) {
            if (streak >= levels[i].minStreak) {
                return { ...levels[i], streak };
            }
        }

        return { ...levels[0], streak };
    }

    /**
     * Подсчёт значков за недели изучения
     * 3 значка за каждую полную неделю
     */
    getWeeklyBadges() {
        const completedDates = Object.keys(this.state.completed)
            .filter(date => Object.keys(this.state.completed[date]).length > 0)
            .sort();

        const weeklyBadges = [];
        let weekCount = 0;

        // Группируем по неделям (каждые 7 дней)
        for (let i = 0; i < completedDates.length; i += 7) {
            const weekDates = completedDates.slice(i, i + 7);
            if (weekDates.length === 7) {
                weekCount++;
                weeklyBadges.push({
                    week: weekCount,
                    dates: weekDates,
                    badges: ['🏅', '🎖️', '🏆']
                });
            }
        }

        return weeklyBadges;
    }

    updateProgress() {
        const dateKey = this.currentDate;
        const completedCount = Object.keys(this.state.completed[dateKey] || {}).length;
        const totalSections = this.contentData.sections.length;
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

    updateAchievements() {
        const totalDays = Object.keys(this.state.completed).length;
        const currentStreak = this.calculateStreak();
        const level = this.calculateLevel();
        const weeklyBadges = this.getWeeklyBadges();

        this.setTextContent('totalScore', this.state.score);
        this.setTextContent('totalStars', this.state.stars);
        this.setTextContent('totalDays', totalDays);

        // Обновляем стрик (огонёк)
        this.setTextContent('currentStreak', currentStreak);
        this.setTextContent('streakIcon', currentStreak > 0 ? '🔥' : '💨');

        // Обновляем уровень
        this.setTextContent('userLevel', level.name);
        this.setTextContent('levelIcon', level.icon);
        this.setTextContent('levelProgress', `${currentStreak}/${this.getNextLevelStreak(level)}`);

        // Обновляем достижения с учетом СТРИКОВ (не общего количества дней)
        this.setTextContent('achievement1', currentStreak >= 7 ? '✅' : '🔒');
        this.setTextContent('achievement2', currentStreak >= 14 ? '✅' : '🔒');
        this.setTextContent('achievement3', currentStreak >= 21 ? '✅' : '🔒');
        this.setTextContent('achievement4', currentStreak >= 30 ? '✅' : '🔒');
        this.setTextContent('achievement5', currentStreak >= 50 ? '✅' : '🔒');

        // Обновляем значки за недели
        this.setTextContent('weeklyBadgesCount', weeklyBadges.length);
        this.renderWeeklyBadges(weeklyBadges);
    }

    /**
     * Получить требуемый стрик для следующего уровня
     */
    getNextLevelStreak(currentLevel) {
        const levels = [
            { name: 'Талмид', minStreak: 0 },
            { name: 'Бакки', minStreak: 7 },
            { name: 'Ламдан', minStreak: 21 },
            { name: 'Рав', minStreak: 50 },
            { name: 'Гаон', minStreak: 100 }
        ];

        const currentIndex = levels.findIndex(l => l.name === currentLevel.name);
        if (currentIndex < levels.length - 1) {
            return levels[currentIndex + 1].minStreak;
        }
        return levels[levels.length - 1].minStreak;
    }

    /**
     * Отрисовка значков за недели
     */
    renderWeeklyBadges(weeklyBadges) {
        const container = document.getElementById('weeklyBadgesContainer');
        if (!container) return;

        if (weeklyBadges.length === 0) {
            container.innerHTML = '<p class="no-badges">Завершите первую неделю, чтобы получить значки!</p>';
            return;
        }

        let html = '<div class="weekly-badges-grid">';
        weeklyBadges.forEach(week => {
            html += `
                <div class="weekly-badge-item">
                    <div class="week-number">Неделя ${week.week}</div>
                    <div class="week-badges">
                        ${week.badges.map(badge => `<span class="badge-icon">${badge}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Функция "Поделиться успехами" в WhatsApp/Telegram
     */
    shareProgress(platform) {
        const currentStreak = this.calculateStreak();
        const level = this.calculateLevel();
        const weeklyBadges = this.getWeeklyBadges();

        const message = `🔥 Мой прогресс в Хитас для детей!\n\n` +
            `📚 Уровень: ${level.icon} ${level.name}\n` +
            `🔥 Стрик: ${currentStreak} дней подряд\n` +
            `⭐ Звёзды: ${this.state.stars}\n` +
            `🏆 Баллы: ${this.state.score}\n` +
            `🏅 Недель завершено: ${weeklyBadges.length}\n\n` +
            `Присоединяйся! 📖`;

        const encodedMessage = encodeURIComponent(message);

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        } else if (platform === 'telegram') {
            window.open(`https://t.me/share/url?url=&text=${encodedMessage}`, '_blank');
        }
    }

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        window.scrollTo(0, 0);
    }

    toggleSetting(setting) {
        // ИСПРАВЛЕНИЕ: правильное переключение состояния
        this.state.settings[setting] = !this.state.settings[setting];
        this.saveProgress();
        
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
                    darkMode: false
                }
            };
            this.saveProgress();
            this.applySettings();
            this.updateProgress();
            this.updateAchievements();
            this.renderTiles();
            alert('✅ Прогресс сброшен!');
        }
    }

    speakContent() {
        if (!this.currentSection) return;

        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();

            const text = this.currentSection.content.paragraphs
                .map(p => p.text)
                .join('. ');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = CONFIG.SPEECH_LANG;
            utterance.rate = CONFIG.SPEECH_RATE;
            utterance.pitch = 1;

            this.speechSynthesis.speak(utterance);
        } else {
            alert('Озвучивание не поддерживается в вашем браузере');
        }
    }

    printPage() {
        window.print();
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
                darkMode: false
            }
        };
    }

    saveProgress() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
            // Автоматическая синхронизация с Firebase (если пользователь авторизован)
            if (window.authManager && window.authManager.getCurrentUser()) {
                this.syncToFirebase(true); // silent mode
            }
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    }

    /**
     * Синхронизация прогресса с Firebase Firestore
     * Локальное хранилище + Firebase sync
     */
    async syncToFirebase(silent = false) {
        if (!window.authManager || !window.authManager.getCurrentUser()) {
            if (!silent) {
                alert('Войдите в систему, чтобы синхронизировать прогресс');
            }
            return;
        }

        try {
            const user = window.authManager.getCurrentUser();
            const userId = user.uid;

            // Используем Firebase Firestore из firebase-config.js
            if (typeof db === 'undefined') {
                console.error('Firebase Firestore not initialized');
                return;
            }

            // Сохраняем прогресс в Firestore
            await db.collection('userProgress').doc(userId).set({
                score: this.state.score,
                stars: this.state.stars,
                completed: this.state.completed,
                settings: this.state.settings,
                lastSync: new Date().toISOString()
            });

            if (!silent) {
                alert('✅ Прогресс синхронизирован с облаком!');
            }
            console.log('Progress synced to Firebase');
        } catch (e) {
            console.error('Error syncing to Firebase:', e);
            if (!silent) {
                alert('❌ Ошибка синхронизации с облаком');
            }
        }
    }

    /**
     * Загрузка прогресса из Firebase Firestore
     */
    async loadFromFirebase() {
        if (!window.authManager || !window.authManager.getCurrentUser()) {
            alert('Войдите в систему, чтобы загрузить прогресс');
            return;
        }

        try {
            const user = window.authManager.getCurrentUser();
            const userId = user.uid;

            if (typeof db === 'undefined') {
                console.error('Firebase Firestore not initialized');
                return;
            }

            const doc = await db.collection('userProgress').doc(userId).get();

            if (doc.exists) {
                const data = doc.data();
                this.state = {
                    score: data.score || 0,
                    stars: data.stars || 0,
                    completed: data.completed || {},
                    settings: data.settings || {
                        sound: true,
                        animations: true,
                        darkMode: false
                    }
                };

                this.saveProgress();
                this.applySettings();
                this.updateProgress();
                this.updateAchievements();
                this.renderTiles();

                alert('✅ Прогресс загружен из облака!');
                console.log('Progress loaded from Firebase');
            } else {
                alert('В облаке нет сохранённого прогресса');
            }
        } catch (e) {
            console.error('Error loading from Firebase:', e);
            alert('❌ Ошибка загрузки из облака');
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
