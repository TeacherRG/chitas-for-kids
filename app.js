/**
 * ХИТАС ДЛЯ ДЕТЕЙ - APPLICATION
 * Interactive daily Jewish texts learning app for children
 */

'use strict';

// ============================================
// CONSTANTS
// ============================================
const CONFIG = {
    DATA_PATH: 'data/',
    STORAGE_KEY: 'chitasProgress',
    DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
    ANIMATION_DURATION: 300,
    SPEECH_LANG: 'ru-RU',
    SPEECH_RATE: 0.9
};

// ============================================
// MAIN APPLICATION CLASS
// ============================================
class ChitasApp {
    constructor() {
        this.data = null;
        this.currentDate = this.getTodayDate();
        this.currentSection = null;
        this.state = this.loadProgress();
        this.matchGame = { selected: [], matched: [] };
        this.speechSynthesis = window.speechSynthesis;
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
        // Navigation buttons
        this.addClickHandler('prevDayBtn', () => this.navigateDate(-1));
        this.addClickHandler('todayBtn', () => this.navigateToToday());
        this.addClickHandler('printBtn', () => window.print());
        this.addClickHandler('nextDayBtn', () => this.navigateDate(1));

        // Section view
        this.addClickHandler('closeSectionBtn', () => this.closeSection());
        this.addClickHandler('speakBtn', () => this.speakContent());

        // Settings
        this.addClickHandler('resetBtn', () => this.resetProgress());

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const viewId = item.dataset.view;
                this.switchView(viewId);
            });
        });

        // Settings toggles
        document.querySelectorAll('.setting-item[data-setting]').forEach(item => {
            item.addEventListener('click', () => {
                const setting = item.dataset.setting;
                this.toggleSetting(setting);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.currentDate = this.getTodayDate();
            this.loadData();
        });
    }

    addClickHandler(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    // ========================================
    // DATE MANAGEMENT
    // ========================================
    getTodayDate() {
        const url = new URL(window.location.href);
        const dateParam = url.searchParams.get('date');
        if (dateParam && this.isValidDate(dateParam)) {
            return dateParam;
        }
        const today = new Date();
        return this.formatDate(today);
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
        const today = new Date();
        this.currentDate = this.formatDate(today);
        this.updateURL();
        this.loadData();
    }

    updateURL() {
        const url = new URL(window.location.href);
        url.searchParams.set('date', this.currentDate);
        window.history.pushState({}, '', url);
    }

    // ========================================
    // DATA LOADING
    // ========================================
    async loadData() {
        try {
            const response = await fetch(`${CONFIG.DATA_PATH}${this.currentDate}.json`);
            
            if (response.ok) {
                this.data = await response.json();
                this.renderPage();
            } else {
                console.warn('Data file not found, using demo data');
                this.data = this.createDemoData();
                this.renderPage();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Ошибка загрузки данных. Проверьте подключение к интернету.');
            this.data = this.createDemoData();
            this.renderPage();
        }
    }

    createDemoData() {
        return {
            date: this.currentDate,
            hebrewDate: "9 Тевета 5786",
            parsha: "Ваехи",
            dedication: "За безопасность и успех евреев в Эрец Исраэль",
            mazalTov: [],
            sections: []
        };
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
        this.setTextContent('hebrewDate', this.data.hebrewDate);
        this.setTextContent('dedication', this.data.dedication);
    }

    renderMazelTov() {
        const container = document.getElementById('mazelTovSection');
        if (!container) return;

        if (!this.data.mazalTov || this.data.mazalTov.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="mazel-tov-section"><h3>🎉 Мазаль Тов!</h3>';
        this.data.mazalTov.forEach(mt => {
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

        if (!this.data.sections || this.data.sections.length === 0) {
            grid.innerHTML = '<div class="loading">Нет данных для отображения</div>';
            return;
        }

        grid.innerHTML = '';
        this.data.sections.forEach(section => {
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
        const section = this.data.sections.find(s => s.id === sectionId);
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

        html += this.renderGames(section);

        container.innerHTML = html;
        this.attachGameHandlers(section);
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

    renderGames(section) {
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
            html += this.renderGame(game, index, section.games.length === 1);
        });

        html += '</div>';
        return html;
    }

    getGameIcon(type) {
        const icons = {
            quiz: '🎯',
            truefalse: '✓',
            match: '🔗',
            reflection: '🤔'
        };
        return icons[type] || '🎮';
    }

    renderGame(game, index, showNow) {
        const display = showNow ? 'active' : '';
        
        switch (game.type) {
            case 'quiz':
                return this.renderQuizGame(game, index, display);
            case 'truefalse':
                return this.renderTrueFalseGame(game, index, display);
            case 'match':
                return this.renderMatchGame(game, index, display);
            case 'reflection':
                return this.renderReflectionGame(game, index, display);
            default:
                return '';
        }
    }

    renderQuizGame(game, index, display) {
        let html = `<div class="quiz-game ${display}" data-game-index="${index}">`;
        html += `<h3 class="quiz-question">${this.escapeHtml(game.question)}</h3>`;
        html += '<div class="quiz-options">';
        
        game.options.forEach((option, i) => {
            html += `<div class="quiz-option" data-option-index="${i}">${this.escapeHtml(option)}</div>`;
        });
        
        html += '</div>';
        html += `
            <div class="quiz-feedback">
                <div class="feedback-title"></div>
                <div class="feedback-text"></div>
            </div>
        `;
        html += '</div>';
        return html;
    }

    renderTrueFalseGame(game, index, display) {
        let html = `<div class="truefalse-game ${display}" data-game-index="${index}">`;
        html += '<div class="truefalse-questions">';
        
        game.questions.forEach((q, i) => {
            html += `
                <div class="truefalse-item" data-question-index="${i}">
                    <div class="truefalse-statement">${i + 1}. ${this.escapeHtml(q.statement)}</div>
                    <div class="truefalse-buttons">
                        <button class="truefalse-button" data-answer="true">✓ Правда</button>
                        <button class="truefalse-button" data-answer="false">✗ Ложь</button>
                    </div>
                    <div class="truefalse-explanation">${this.escapeHtml(q.explanation)}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }

    renderMatchGame(game, index, display) {
        let html = `<div class="match-game ${display}" data-game-index="${index}">`;
        html += `<div class="match-instruction">${this.escapeHtml(game.instruction)}</div>`;
        html += '<div class="match-pairs">';
        
        html += '<div class="match-column">';
        game.pairs.forEach((pair, i) => {
            html += `<div class="match-item" data-side="left" data-pair-id="${i}">${this.escapeHtml(pair.left)}</div>`;
        });
        html += '</div>';
        
        html += '<div class="match-column">';
        const shuffled = this.shuffleArray([...game.pairs]);
        shuffled.forEach(pair => {
            const originalIndex = game.pairs.findIndex(p => p.id === pair.id);
            html += `<div class="match-item" data-side="right" data-pair-id="${originalIndex}">${this.escapeHtml(pair.right)}</div>`;
        });
        html += '</div>';
        
        html += '</div></div>';
        return html;
    }

    renderReflectionGame(game, index, display) {
        return `
            <div class="reflection-game ${display}" data-game-index="${index}">
                <div class="reflection-question">${this.escapeHtml(game.question)}</div>
                <textarea class="reflection-textarea" placeholder="${this.escapeHtml(game.prompt)}"></textarea>
                <button class="btn reflection-save">💾 Сохранить размышление</button>
            </div>
        `;
    }

    // ========================================
    // GAME HANDLERS
    // ========================================
    attachGameHandlers(section) {
        document.querySelectorAll('.game-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameIndex = parseInt(e.target.dataset.gameIndex);
                this.showGame(gameIndex);
            });
        });

        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                if (e.target.classList.contains('disabled')) return;
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                const gameEl = e.target.closest('.quiz-game');
                const gameIndex = parseInt(gameEl.dataset.gameIndex);
                this.handleQuizAnswer(section, gameIndex, optionIndex);
            });
        });

        document.querySelectorAll('.truefalse-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('disabled')) return;
                const answer = e.target.dataset.answer === 'true';
                const item = e.target.closest('.truefalse-item');
                const questionIndex = parseInt(item.dataset.questionIndex);
                const gameEl = e.target.closest('.truefalse-game');
                const gameIndex = parseInt(gameEl.dataset.gameIndex);
                this.handleTrueFalseAnswer(section, gameIndex, questionIndex, answer, item, e.target);
            });
        });

        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleMatchClick(section, e.target);
            });
        });

        document.querySelectorAll('.reflection-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const game = e.target.closest('.reflection-game');
                const textarea = game.querySelector('.reflection-textarea');
                this.handleReflectionSave(section, textarea.value);
            });
        });
    }

    showGame(gameIndex) {
        document.querySelectorAll('.quiz-game, .truefalse-game, .match-game, .reflection-game').forEach(g => {
            g.classList.remove('active');
        });
        
        const games = document.querySelectorAll('[data-game-index="' + gameIndex + '"]');
        games.forEach(g => g.classList.add('active'));
        
        const menu = document.getElementById('gameMenu');
        if (menu) menu.style.display = 'none';
    }

    handleQuizAnswer(section, gameIndex, optionIndex) {
        const game = section.games[gameIndex];
        const isCorrect = optionIndex === game.correctIndex;
        
        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.add('disabled');
        });

        const options = document.querySelectorAll('.quiz-option');
        if (isCorrect) {
            options[optionIndex].classList.add('correct');
            this.showFeedback(true, game.explanation);
            this.addScore(section.points, section.id);
        } else {
            options[optionIndex].classList.add('incorrect');
            options[game.correctIndex].classList.add('correct');
            this.showFeedback(false, game.explanation);
        }
    }

    showFeedback(success, text) {
        const feedback = document.querySelector('.quiz-feedback');
        if (!feedback) return;

        feedback.className = success ? 'quiz-feedback success show' : 'quiz-feedback error show';
        const title = feedback.querySelector('.feedback-title');
        const textEl = feedback.querySelector('.feedback-text');
        
        if (title) title.textContent = success ? '🎉 Отлично!' : '😔 Неправильно';
        if (textEl) textEl.textContent = text;
    }

    handleTrueFalseAnswer(section, gameIndex, questionIndex, answer, itemEl, buttonEl) {
        const game = section.games[gameIndex];
        const question = game.questions[questionIndex];
        const isCorrect = answer === question.correct;

        itemEl.querySelectorAll('.truefalse-button').forEach(btn => {
            btn.classList.add('disabled');
        });

        if (isCorrect) {
            buttonEl.classList.add('correct');
        } else {
            buttonEl.classList.add('incorrect');
            const correctBtn = itemEl.querySelector(`[data-answer="${question.correct}"]`);
            if (correctBtn) correctBtn.classList.add('correct');
        }

        const explanation = itemEl.querySelector('.truefalse-explanation');
        if (explanation) explanation.classList.add('show');

        const gameEl = itemEl.closest('.truefalse-game');
        const allAnswered = Array.from(gameEl.querySelectorAll('.truefalse-item'))
            .every(item => item.querySelector('.truefalse-button.disabled'));
        
        if (allAnswered) {
            this.addScore(section.points, section.id);
        }
    }

    handleMatchClick(section, item) {
        if (item.classList.contains('matched') || item.classList.contains('disabled')) return;

        const pairId = parseInt(item.dataset.pairId);
        const side = item.dataset.side;

        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            this.matchGame.selected = this.matchGame.selected.filter(
                s => !(s.side === side && s.pairId === pairId)
            );
        } else {
            item.classList.add('selected');
            this.matchGame.selected.push({ side, pairId, element: item });
        }

        if (this.matchGame.selected.length === 2) {
            const [first, second] = this.matchGame.selected;
            
            setTimeout(() => {
                if (first.side !== second.side && first.pairId === second.pairId) {
                    first.element.classList.remove('selected');
                    second.element.classList.remove('selected');
                    first.element.classList.add('matched');
                    second.element.classList.add('matched');
                    this.matchGame.matched.push(first.pairId);
                    
                    const gameEl = item.closest('.match-game');
                    const totalPairs = gameEl.querySelectorAll('.match-item[data-side="left"]').length;
                    if (this.matchGame.matched.length === totalPairs) {
                        this.addScore(section.points, section.id);
                        this.matchGame = { selected: [], matched: [] };
                    }
                } else {
                    first.element.classList.remove('selected');
                    second.element.classList.remove('selected');
                }
                this.matchGame.selected = [];
            }, 300);
        }
    }

    handleReflectionSave(section, text) {
        if (text.trim().length > 10) {
            this.addScore(section.points, section.id);
            alert('💾 Размышление сохранено!');
        } else {
            alert('✍️ Напиши хотя бы пару предложений');
        }
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
        const totalSections = this.data.sections.length;
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
            if (saved) {
                return JSON.parse(saved);
            }
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
        if (element) {
            element.textContent = text;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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
