/**
 * ACHIEVEMENTS MANAGER
 * Модуль для управления стриками, уровнями, значками и синхронизацией
 */

'use strict';

class AchievementsManager {
    constructor(app) {
        this.app = app;
        this.levels = [
            { name: 'Талмид', icon: '📚', minStreak: 0, color: '#4CAF50' },
            { name: 'Бакки', icon: '📖', minStreak: 7, color: '#2196F3' },
            { name: 'Ламдан', icon: '🎓', minStreak: 21, color: '#9C27B0' },
            { name: 'Рав', icon: '🎯', minStreak: 50, color: '#FF9800' },
            { name: 'Гаон', icon: '⭐', minStreak: 100, color: '#FFD700' }
        ];
    }

    /**
     * Подсчёт текущего стрика (серии дней подряд)
     * КРИТИЧНО для визуализации огонька
     */
    calculateStreak() {
        const completedDates = Object.keys(this.app.state.completed)
            .filter(date => Object.keys(this.app.state.completed[date]).length > 0)
            .sort()
            .reverse();

        if (completedDates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < completedDates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const checkDateStr = this.app.formatDate(checkDate);

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

        for (let i = this.levels.length - 1; i >= 0; i--) {
            if (streak >= this.levels[i].minStreak) {
                return { ...this.levels[i], streak };
            }
        }

        return { ...this.levels[0], streak };
    }

    /**
     * Получить требуемый стрик для следующего уровня
     */
    getNextLevelStreak(currentLevel) {
        const currentIndex = this.levels.findIndex(l => l.name === currentLevel.name);
        if (currentIndex < this.levels.length - 1) {
            return this.levels[currentIndex + 1].minStreak;
        }
        return this.levels[this.levels.length - 1].minStreak;
    }

    /**
     * Подсчёт значков за недели изучения
     * 3 значка за каждую полную неделю
     */
    getWeeklyBadges() {
        const completedDates = Object.keys(this.app.state.completed)
            .filter(date => Object.keys(this.app.state.completed[date]).length > 0)
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
     * Обновление всех достижений
     */
    updateAchievements() {
        const totalDays = Object.keys(this.app.state.completed).length;
        const currentStreak = this.calculateStreak();
        const level = this.calculateLevel();
        const weeklyBadges = this.getWeeklyBadges();

        this.app.setTextContent('totalScore', this.app.state.score);
        this.app.setTextContent('totalStars', this.app.state.stars);
        this.app.setTextContent('totalDays', totalDays);

        // Обновляем стрик (огонёк)
        this.app.setTextContent('currentStreak', currentStreak);
        this.app.setTextContent('streakIcon', currentStreak > 0 ? '🔥' : '💨');

        // Обновляем уровень
        this.app.setTextContent('userLevel', level.name);
        this.app.setTextContent('levelIcon', level.icon);
        this.app.setTextContent('levelProgress', `${currentStreak}/${this.getNextLevelStreak(level)}`);

        // Обновляем достижения с учетом СТРИКОВ (не общего количества дней)
        this.app.setTextContent('achievement1', currentStreak >= 7 ? '✅' : '🔒');
        this.app.setTextContent('achievement2', currentStreak >= 14 ? '✅' : '🔒');
        this.app.setTextContent('achievement3', currentStreak >= 21 ? '✅' : '🔒');
        this.app.setTextContent('achievement4', currentStreak >= 30 ? '✅' : '🔒');
        this.app.setTextContent('achievement5', currentStreak >= 50 ? '✅' : '🔒');

        // Обновляем значки за недели
        this.app.setTextContent('weeklyBadgesCount', weeklyBadges.length);
        this.renderWeeklyBadges(weeklyBadges);
    }

    /**
     * Функция "Поделиться успехами" в WhatsApp/Telegram
     */
    shareProgress(platform) {
        const currentStreak = this.calculateStreak();
        const level = this.calculateLevel();
        const weeklyBadges = this.getWeeklyBadges();

        const message = `🔥 Мой прогресс в Хитас для вундеркиндов!\n\n` +
            `📚 Уровень: ${level.icon} ${level.name}\n` +
            `🔥 Стрик: ${currentStreak} дней подряд\n` +
            `⭐ Звёзды: ${this.app.state.stars}\n` +
            `🏆 Баллы: ${this.app.state.score}\n` +
            `🏅 Недель завершено: ${weeklyBadges.length}\n\n` +
            `Присоединяйся! 📖\n` +
            `www.mychitas.app`;

        const encodedMessage = encodeURIComponent(message);

        if (platform === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        } else if (platform === 'telegram') {
            window.open(`https://t.me/share/url?url=&text=${encodedMessage}`, '_blank');
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
                score: this.app.state.score,
                stars: this.app.state.stars,
                completed: this.app.state.completed,
                settings: this.app.state.settings,
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
                this.app.state = {
                    score: data.score || 0,
                    stars: data.stars || 0,
                    completed: data.completed || {},
                    settings: data.settings || {
                        sound: true,
                        animations: true,
                        darkMode: false
                    }
                };

                this.app.saveProgress();
                this.app.applySettings();
                this.app.updateProgress();
                this.updateAchievements();
                this.app.renderTiles();

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
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementsManager;
}
