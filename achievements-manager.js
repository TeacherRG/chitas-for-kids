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
     * ВАЖНО: Пропуск в субботу не сбрасывает стрик (достаточно 6 дней в неделю)
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
                // Проверяем, является ли пропущенный день субботой (6 = суббота)
                const dayOfWeek = checkDate.getDay();
                if (dayOfWeek === 6) {
                    // Суббота - пропускаем без сброса стрика
                    continue;
                } else {
                    // Любой другой день - сбрасываем стрик
                    break;
                }
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
     * Проверка, является ли устройство мобильным
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Функция "Поделиться успехами" в WhatsApp/Telegram
     * С поддержкой Web Share API для правильного отображения эмодзи на десктопе
     */
    async shareProgress(platform) {
        const currentStreak = this.calculateStreak();
        const level = this.calculateLevel();
        const weeklyBadges = this.getWeeklyBadges();
        const maxStreak = this.app.state.maxStreak || 0;

        // Строка стрика с учетом максимального значения
        const streakText = maxStreak > currentStreak
            ? `🔥 Стрик: ${currentStreak} дней (рекорд: ${maxStreak})`
            : `🔥 Стрик: ${currentStreak} дней подряд`;

        const message = `🔥 Мой прогресс в Хитас для вундеркиндов!\n\n` +
            `📚 Уровень: ${level.icon} ${level.name}\n` +
            `${streakText}\n` +
            `⭐ Звёзды: ${this.app.state.stars}\n` +
            `🏆 Баллы: ${this.app.state.score}\n` +
            `🏅 Недель завершено: ${weeklyBadges.length}\n\n` +
            `Присоединяйся! 📖\n` +
            `www.mychitas.app`;

        // Проверяем, доступен ли Web Share API (для правильного отображения эмодзи на десктопе)
        if (navigator.share && !this.isMobileDevice()) {
            try {
                await navigator.share({
                    title: 'Мой прогресс в Хитас для вундеркиндов!',
                    text: message
                });
                return;
            } catch (err) {
                // Если пользователь отменил или произошла ошибка, продолжаем с обычным методом
                console.log('Web Share cancelled or failed:', err);
            }
        }

        // Для мобильных устройств или если Web Share не доступен - используем прямые ссылки
        const encodedMessage = encodeURIComponent(message);

        if (platform === 'whatsapp') {
            // На мобильных устройствах используем api.whatsapp.com для лучшей совместимости
            const whatsappUrl = this.isMobileDevice()
                ? `https://api.whatsapp.com/send?text=${encodedMessage}`
                : `https://web.whatsapp.com/send?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        } else if (platform === 'telegram') {
            window.open(`https://t.me/share/url?url=&text=${encodedMessage}`, '_blank');
        }
    }

    /**
     * Синхронизация прогресса с Firebase Firestore
     * @async
     * @param {boolean} silent - Если true, не показывать пользователю сообщения и ошибки
     * @returns {Promise<void>}
     *
     * Сохраняет в Firebase полное состояние приложения:
     * - score, stars - Баллы и звёзды
     * - completed - Все пройденные секции по датам
     * - currentStreak - Текущий стрик (дни подряд)
     * - maxStreak - Максимальный стрик за всё время (КРИТИЧНО для сохранения рекордов!)
     * - settings - Пользовательские настройки
     * - lastSync - Timestamp последней синхронизации
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
                console.error('❌ Firebase Firestore not initialized');
                if (!silent) {
                    alert('❌ Firebase не инициализирован');
                }
                return;
            }

            console.log('📤 Syncing progress to Firebase for user:', userId);

            // ========== СОХРАНЕНИЕ В FIRESTORE ==========
            // Сохраняем полное состояние приложения, включая стрики
            await db.collection('userProgress').doc(userId).set({
                score: this.app.state.score,
                stars: this.app.state.stars,
                completed: this.app.state.completed,
                // КРИТИЧНО: Сохраняем стрики для защиты от потери данных
                currentStreak: this.app.state.currentStreak || 0,  // Текущий стрик
                maxStreak: this.app.state.maxStreak || 0,          // Максимальный стрик (рекорд)
                settings: this.app.state.settings,
                lastSync: new Date().toISOString()  // Время синхронизации для отладки
            });

            if (!silent) {
                alert('✅ Прогресс синхронизирован с облаком!');
            }
            console.log('✅ Progress synced to Firebase successfully');
        } catch (e) {
            console.error('❌ Error syncing to Firebase:', e);
            console.error('Error code:', e.code);
            console.error('Error message:', e.message);

            if (!silent) {
                let errorMessage = '❌ Ошибка синхронизации с облаком';

                // Детальные сообщения об ошибках для пользователя
                if (e.code === 'permission-denied') {
                    errorMessage = '❌ Нет прав доступа к базе данных.\n\nНеобходимо настроить правила безопасности в Firebase Console:\n1. Откройте Firebase Console\n2. Firestore Database → Rules\n3. Установите правила доступа';
                } else if (e.code === 'unavailable') {
                    errorMessage = '❌ Нет подключения к интернету';
                } else if (e.message) {
                    errorMessage += '\n\n' + e.message;
                }

                alert(errorMessage);
            }
        }
    }

    /**
     * Загрузка прогресса из Firebase Firestore
     * ВНИМАНИЕ: Этот метод мерджит прогресс из Firebase с локальным прогрессом,
     * а не перезаписывает его полностью
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
                alert('❌ Firebase не инициализирован');
                return;
            }

            console.log('Loading progress from Firebase for user:', userId);

            const doc = await db.collection('userProgress').doc(userId).get();

            if (doc.exists) {
                const firebaseData = doc.data();
                const localData = this.app.state;

                // Мерджим прогресс вместо перезаписи
                const mergedState = {
                    score: Math.max(localData.score || 0, firebaseData.score || 0),
                    stars: Math.max(localData.stars || 0, firebaseData.stars || 0),
                    completed: this.app.mergeCompletedData(localData.completed || {}, firebaseData.completed || {}),
                    currentStreak: Math.max(localData.currentStreak || 0, firebaseData.currentStreak || 0),
                    maxStreak: Math.max(localData.maxStreak || 0, firebaseData.maxStreak || 0),
                    settings: { ...localData.settings, ...firebaseData.settings }
                };

                this.app.state = mergedState;

                this.app.saveProgress();
                this.app.applySettings();
                this.app.updateProgress();
                this.updateAchievements();
                this.app.renderTiles();

                alert('✅ Прогресс синхронизирован с облаком!\n\nВаш локальный прогресс объединен с прогрессом из облака.');
                console.log('✅ Progress merged from Firebase successfully');
            } else {
                alert('В облаке нет сохранённого прогресса.\n\nВаш локальный прогресс будет загружен в облако.');
                // Синхронизируем локальный прогресс в Firebase
                await this.syncToFirebase(false);
                console.log('No saved progress found in Firebase, uploaded local progress');
            }
        } catch (e) {
            console.error('❌ Error loading from Firebase:', e);
            console.error('Error code:', e.code);
            console.error('Error message:', e.message);

            let errorMessage = '❌ Ошибка загрузки из облака';

            // Детальные сообщения об ошибках
            if (e.code === 'permission-denied') {
                errorMessage = '❌ Нет прав доступа к базе данных.\n\nНеобходимо настроить правила безопасности в Firebase Console:\n1. Откройте Firebase Console\n2. Firestore Database → Rules\n3. Установите правила доступа';
            } else if (e.code === 'unavailable') {
                errorMessage = '❌ Нет подключения к интернету';
            } else if (e.message) {
                errorMessage += '\n\n' + e.message;
            }

            alert(errorMessage);
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementsManager;
}
