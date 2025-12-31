/**
 * ХИТАС ДЛЯ ДЕТЕЙ - APPLICATION (REFACTORED v2.0)
 * Using modular game engines and split data files
 */

'use strict';

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
    DATA_PATH: 'data/',
    STORAGE_KEY: 'chitasProgress',
    SPEECH_LANG: 'ru-RU',
    SPEECH_RATE: 0.9
};

// ============================================
// MAIN APPLICATION CLASS
// ============================================
class ChitasApp {
    constructor() {
        this.contentData = null;
        this.gamesData = null;
        this.currentDate = this.getTodayDate();
        this.currentSection = null;
        this.state = this.loadProgress();
        this.speechSynthesis = window.speechSynthesis;
        this.gameInstances = {};
        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        this.addClickHandler('prevDayBtn', () => this.navigateDate(-1));
        this.addClickHandler('todayBtn', () => this.navigateToToday());
        this.addClickHandler('printBtn', () => window.print());
        this.addClickHandler('nextDayBtn', () => this.navigateDate(1));
        this.addClickHandler('closeSectionBtn', () => this.closeSection());
        this.addClickHandler('speakBtn', () => this.speakContent());
        this.addClickHandler('resetBtn', () => this.resetProgress());

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchView(item.dataset.view);
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

    // ========================================
    // DATE MANAGEMENT
    // ========================================
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

    // ========================================
    // DATA LOADING (NEW STRUCTURE)
    // ========================================
    async loadData() {
        try {
            // Load index to get file names
            const indexResponse = await fetch(`${CONFIG.DATA_PATH}index.json`);
            const index = await indexResponse.json();
            
            const dateEntry = index.dates.find(d => d.date === this.currentDate);
            
            if (!dateEntry) {
                console.warn('Date not found in index');
                this.showError('Нет данных для этой даты');
                return;
            }

            // Load content and games separately
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
        // Merge games into sections
        if (this.contentData && this.gamesData) {
            this.contentData.sections.forEach(section => {
                const sectionGames = this.gamesData.games[section.id];
                if (sectionGames) {
                    section.games = sectionGames;
                }
            });
        }
    }

    // ========================================
    // RENDERING
    // ========================================
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

    // ========================================
    // SECTION VIEW
    // ========================================
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
        this.gameInstances = {};
        
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

        // Create empty containers for each game
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

    // ========================================
    // GAME INITIALIZATION (USING MODULES)
    // ========================================
    initializeGames(section) {
        if (!section.games) return;

        section.games.forEach((gameData, index) => {
            const container = document.querySelector(`.game-wrapper[data-game-index="${index}"]`);
            if (!container) return;

            const onComplete = (success) => {
                if (success) this.addScore(section.points, section.id);
            };

            let gameInstance;
            switch (gameData.type) {
                case 'quiz':
                    gameInstance = new QuizGame(gameData, container, onComplete);
                    break;
                case 'truefalse':
                    gameInstance = new TrueFalseGame(gameData, container, onComplete);
                    break;
                case 'match':
                    gameInstance = new MatchGame(gameData, container, onComplete);
                    break;
                case 'reflection':
                    gameInstance = new ReflectionGame(gameData, container, onComplete);
                    break;
                case 'wheel':
                    gameInstance = new WheelGame(gameData, container, onComplete);
                    break;
                default:
                    console.warn(`Unknown game type: ${gameData.type}`);
                    return;
            }

            this.gameInstances[`${section.id}-${index}`] = gameInstance;
            
            // Show first game by default, hide others
            if (index === 0 || section.games.length === 1) {
                gameInstance.render();
            }
        });

        // Attach game menu handlers
        document.querySelectorAll('.game-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameIndex = parseInt(e.target.dataset.gameIndex);
                this.showGame(section, gameIndex);
            });
        });
    }

    showGame(section, gameIndex) {
        // Hide all games
        document.querySelectorAll('.game-wrapper').forEach(wrapper => {
            wrapper.innerHTML = '';
        });
        
        // Show selected game
        const container = document.querySelector(`.game-wrapper[data-game-index="${gameIndex}"]`);
        const gameInstance = this.gameInstances[`${section.id}-${gameIndex}`];
        
        if (container && gameInstance) {
            gameInstance.render();
        }
        
        // Hide game menu
        const menu = document.getElementById('gameMenu');
        if (menu) menu.style.display = 'none';
    }

    // ========================================
    // PROGRESS & SCORING
    // ========================================
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

    // ========================================
    // VIEW SWITCHING
    // ========================================
    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        window.scrollTo(0, 0);
    }

    // ========================================
    // SETTINGS
    // ========================================
    toggleSetting(setting) {
        this.state.settings[setting] = !this.state.settings[setting];
        this.saveProgress();
        
        const toggleId = setting + 'Toggle';
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.classList.toggle('active', this.state.settings[setting]);
        }

        if (setting === 'darkMode') {
            document.body.classList.toggle('dark-mode', this.state.settings[setting]);
        }
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
            this.updateProgress();
            this.updateAchievements();
            this.renderTiles();
            alert('✅ Прогресс сброшен!');
        }
    }

    // ========================================
    // TEXT-TO-SPEECH
    // ========================================
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

    // ========================================
    // STORAGE
    // ========================================
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

    // ========================================
    // UTILITY METHODS
    // ========================================
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

// ============================================
// APP INITIALIZATION
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new ChitasApp();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChitasApp;
}
