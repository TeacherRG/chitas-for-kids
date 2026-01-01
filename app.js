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
        this.setupLanguageSelector();
        this.applySettings();

        // Initialize language (don't block on translation)
        this.initLanguage();

        // Load data immediately
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

    setupLanguageSelector() {
        const langBtn = document.getElementById('currentLangBtn');
        const langSelector = document.getElementById('languageSelector');
        const langOptions = document.querySelectorAll('.lang-option');

        if (langBtn) {
            langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                langSelector.classList.toggle('active');
            });
        }

        langOptions.forEach(option => {
            option.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lang = option.dataset.lang;
                await this.changeLanguage(lang);
                langSelector.classList.remove('active');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            langSelector.classList.remove('active');
        });

        // Update current language display
        this.updateLanguageDisplay();
    }

    updateLanguageDisplay() {
        const currentLang = window.i18n.getCurrentLanguage();
        const langBtn = document.getElementById('currentLangBtn');
        const langOptions = document.querySelectorAll('.lang-option');

        if (langBtn && window.i18n.LANGUAGES[currentLang]) {
            langBtn.textContent = window.i18n.LANGUAGES[currentLang].flag;
        }

        langOptions.forEach(option => {
            if (option.dataset.lang === currentLang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    async initLanguage() {
        if (!window.i18n) {
            console.warn('i18n module not loaded');
            return;
        }

        const currentLang = window.i18n.getCurrentLanguage();
        window.i18n.setLanguage(currentLang);
        this.updateLanguageDisplay();

        // Translate static UI elements
        await this.translateUI();
    }

    async changeLanguage(lang) {
        if (!window.i18n) return;

        window.i18n.setLanguage(lang);
        this.updateLanguageDisplay();

        // Translate UI
        await this.translateUI();

        // Reload data to translate content
        if (this.contentData && this.gamesData) {
            await this.loadData();
        }
    }

    async translateUI() {
        if (!window.i18n) return;

        const lang = window.i18n.getCurrentLanguage();

        // For Russian, no translation needed - just save originals
        if (lang === 'ru') {
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(element => {
                if (!element.getAttribute('data-i18n-original')) {
                    element.setAttribute('data-i18n-original', element.textContent);
                }
            });
            return;
        }

        const elements = document.querySelectorAll('[data-i18n]');

        for (const element of elements) {
            const originalText = element.getAttribute('data-i18n-original') || element.textContent;

            // Save original if not saved
            if (!element.getAttribute('data-i18n-original')) {
                element.setAttribute('data-i18n-original', originalText);
            }

            await window.i18n.translateElement(element, originalText);
        }
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
                const errorMsg = await this.translateText('Нет данных для этой даты');
                this.showError(errorMsg);
                return;
            }

            const [contentResponse, gamesResponse] = await Promise.all([
                fetch(`${CONFIG.DATA_PATH}${dateEntry.content}`),
                fetch(`${CONFIG.DATA_PATH}${dateEntry.games}`)
            ]);

            if (contentResponse.ok && gamesResponse.ok) {
                this.contentData = await contentResponse.json();
                this.gamesData = await gamesResponse.json();

                // Translate content and games data
                await this.translateContentData();

                this.mergeData();
                this.renderPage();
            } else {
                throw new Error('Failed to load data files');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            const errorMsg = await this.translateText('Ошибка загрузки данных');
            this.showError(errorMsg);
        }
    }

    async translateText(text) {
        if (!window.i18n) return text;
        const lang = window.i18n.getCurrentLanguage();
        return await window.i18n.translateWithGemini(text, lang);
    }

    async translateContentData() {
        if (!window.i18n) return;

        const lang = window.i18n.getCurrentLanguage();
        if (lang === 'ru') return; // No translation needed

        // Translate content sections
        if (this.contentData && this.contentData.sections) {
            for (const section of this.contentData.sections) {
                if (section.title) {
                    section.title = await window.i18n.translateWithGemini(section.title, lang);
                }
                if (section.content) {
                    section.content = await window.i18n.translateWithGemini(section.content, lang);
                }
                if (section.dedication) {
                    section.dedication = await window.i18n.translateWithGemini(section.dedication, lang);
                }
            }
        }

        // Translate dedication
        if (this.contentData && this.contentData.dedication) {
            this.contentData.dedication = await window.i18n.translateWithGemini(this.contentData.dedication, lang);
        }

        // Translate games data
        if (this.gamesData && this.gamesData.games) {
            for (const sectionKey in this.gamesData.games) {
                const games = this.gamesData.games[sectionKey];
                for (const game of games) {
                    await this.translateGameData(game, lang);
                }
            }
        }
    }

    async translateGameData(game, lang) {
        if (!game || lang === 'ru') return game;

        // Translate common fields
        if (game.title) {
            game.title = await window.i18n.translateWithGemini(game.title, lang);
        }
        if (game.question) {
            game.question = await window.i18n.translateWithGemini(game.question, lang);
        }
        if (game.explanation) {
            game.explanation = await window.i18n.translateWithGemini(game.explanation, lang);
        }
        if (game.instruction) {
            game.instruction = await window.i18n.translateWithGemini(game.instruction, lang);
        }
        if (game.prompt) {
            game.prompt = await window.i18n.translateWithGemini(game.prompt, lang);
        }

        // Translate quiz options
        if (game.options && Array.isArray(game.options)) {
            game.options = await Promise.all(
                game.options.map(opt => window.i18n.translateWithGemini(opt, lang))
            );
        }

        // Translate true/false questions
        if (game.questions && Array.isArray(game.questions)) {
            for (const q of game.questions) {
                if (q.statement) {
                    q.statement = await window.i18n.translateWithGemini(q.statement, lang);
                }
                if (q.explanation) {
                    q.explanation = await window.i18n.translateWithGemini(q.explanation, lang);
                }
                if (q.text) {
                    q.text = await window.i18n.translateWithGemini(q.text, lang);
                }
            }
        }

        // Translate match pairs (keep Hebrew in parentheses)
        if (game.pairs && Array.isArray(game.pairs)) {
            for (const pair of game.pairs) {
                if (pair.left) {
                    pair.left = await window.i18n.translateWithGemini(pair.left, lang);
                }
                if (pair.right) {
                    pair.right = await window.i18n.translateWithGemini(pair.right, lang);
                }
            }
        }

        return game;
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

    openSection(sectionId) {
        const section = this.contentData.sections.find(s => s.id === sectionId);
        if (!section) return;

        this.currentSection = section;
        document.body.classList.add('section-open');
        
        const sectionView = document.getElementById('sectionView');
        sectionView.classList.add('active');
        
        this.setTextContent('sectionTitle', section.title);
        this.renderSectionContent(section);
        
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

    renderSectionContent(section) {
        const container = document.getElementById('sectionContent');
        if (!container) return;

        let html = '';

        if (section.content.title) {
            html += `<h2 class="content-title">${this.escapeHtml(section.content.title)}</h2>`;
        }

        section.content.paragraphs.forEach(para => {
            html += this.renderParagraph(para);
        });

        html += this.renderGamesContainer(section);

        container.innerHTML = html;
        this.initializeGames(section);
    }

    renderParagraph(para) {
        const classList = ['content-paragraph', para.type].filter(Boolean).join(' ');
        let content = '';

        if (para.title) {
            content += `<div class="paragraph-title">${this.escapeHtml(para.title)}</div>`;
        }
        content += this.escapeHtml(para.text);

        return `<div class="${classList}">${content}</div>`;
    }

    renderGamesContainer(section) {
        if (!section.games || section.games.length === 0) return '';

        let html = '<div class="game-container">';
        
        if (section.games.length > 1) {
            html += `
                <div class="game-menu" id="gameMenu">
                    <h3>🎮 Выбери игру!</h3>
                    <div class="game-buttons">
            `;
            section.games.forEach((game, index) => {
                html += `<button class="game-button" data-game-index="${index}">${this.getGameIcon(game.type)} ${this.escapeHtml(game.title)}</button>`;
            });
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
    initializeGames(section) {
        if (!section.games) return;

        section.games.forEach((gameData, index) => {
            this.initializeSingleGame(section, gameData, index);
        });

        this.setupGameButtons(section);
    }

    /**
     * Initialize a single game instance
     */
    initializeSingleGame(section, gameData, index) {
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
        
        this.setTextContent('totalScore', this.state.score);
        this.setTextContent('totalStars', this.state.stars);
        this.setTextContent('totalDays', totalDays);

        this.setTextContent('achievement1', totalDays >= 7 ? '✅' : '🔒');
        this.setTextContent('achievement2', totalDays >= 14 ? '✅' : '🔒');
        this.setTextContent('achievement3', this.state.stars >= 30 ? '✅' : '🔒');
        this.setTextContent('achievement4', this.state.score >= 500 ? '✅' : '🔒');
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

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ChitasApp();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChitasApp;
}
