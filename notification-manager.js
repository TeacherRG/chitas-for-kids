/**
 * NOTIFICATION MANAGER
 * Управление push-уведомлениями для приложения Хитас для детей
 */

'use strict';

class NotificationManager {
    constructor() {
        this.NOTIFICATION_TIME = { hour: 18, minute: 0 }; // 18:00
        this.NOTIFICATION_TITLE = '🎓 Хитас для детей';
        this.NOTIFICATION_BODY = 'Не забудьте пройти сегодня урок! 📚';
        this.NOTIFICATION_TAG = 'daily-reminder';
        this.checkInterval = null;
    }

    /**
     * Проверка поддержки уведомлений браузером
     */
    isSupported() {
        return 'Notification' in window && 'serviceWorker' in navigator;
    }

    /**
     * Получить текущий статус разрешения
     */
    getPermissionStatus() {
        if (!this.isSupported()) return 'unsupported';
        return Notification.permission;
    }

    /**
     * Запросить разрешение на уведомления
     */
    async requestPermission() {
        if (!this.isSupported()) {
            console.warn('⚠️ Push-уведомления не поддерживаются в этом браузере');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('✅ Разрешение на уведомления уже получено');
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('⚠️ Пользователь заблокировал уведомления');
            alert('Уведомления заблокированы. Разрешите их в настройках браузера.');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Разрешение на уведомления получено');
                return true;
            } else {
                console.warn('⚠️ Пользователь отклонил разрешение на уведомления');
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка при запросе разрешения:', error);
            return false;
        }
    }

    /**
     * Включить уведомления
     */
    async enable() {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) return false;

        // Запускаем планировщик уведомлений
        this.scheduleNotifications();
        console.log('✅ Push-уведомления включены');

        // Показываем тестовое уведомление
        this.showTestNotification();

        return true;
    }

    /**
     * Отключить уведомления
     */
    disable() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('✅ Push-уведомления отключены');
    }

    /**
     * Показать тестовое уведомление
     */
    showTestNotification() {
        if (Notification.permission !== 'granted') return;

        const notification = new Notification('🎓 Хитас для детей', {
            body: 'Уведомления успешно включены! Вы будете получать напоминания в 18:00 каждый день.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-notification',
            requireInteraction: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Автоматически закрываем через 5 секунд
        setTimeout(() => notification.close(), 5000);
    }

    /**
     * Показать ежедневное напоминание
     */
    showDailyReminder() {
        if (Notification.permission !== 'granted') return;

        console.log('🔔 Отправка ежедневного напоминания');

        const notification = new Notification(this.NOTIFICATION_TITLE, {
            body: this.NOTIFICATION_BODY,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: this.NOTIFICATION_TAG,
            requireInteraction: false,
            data: {
                url: window.location.origin,
                timestamp: Date.now()
            }
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Сохраняем время последнего уведомления
        localStorage.setItem('lastNotificationTime', Date.now());
    }

    /**
     * Проверить, нужно ли показать уведомление
     */
    shouldShowNotification() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Проверяем, что сейчас 18:00
        if (currentHour !== this.NOTIFICATION_TIME.hour || currentMinute !== this.NOTIFICATION_TIME.minute) {
            return false;
        }

        // Проверяем, показывали ли уже уведомление сегодня
        const lastNotification = localStorage.getItem('lastNotificationTime');
        if (lastNotification) {
            const lastDate = new Date(parseInt(lastNotification));
            const today = new Date();

            // Если уведомление уже было показано сегодня, не показываем еще раз
            if (lastDate.toDateString() === today.toDateString()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Запустить планировщик уведомлений
     * Проверяет каждую минуту, нужно ли показать уведомление
     */
    scheduleNotifications() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Проверяем каждую минуту
        this.checkInterval = setInterval(() => {
            if (this.shouldShowNotification()) {
                this.showDailyReminder();
            }
        }, 60000); // 60 секунд

        // Также проверяем сразу при запуске
        if (this.shouldShowNotification()) {
            this.showDailyReminder();
        }

        console.log('⏰ Планировщик уведомлений запущен (проверка каждую минуту)');
    }

    /**
     * Получить время до следующего уведомления
     */
    getTimeUntilNextNotification() {
        const now = new Date();
        const next = new Date();
        next.setHours(this.NOTIFICATION_TIME.hour, this.NOTIFICATION_TIME.minute, 0, 0);

        // Если время уже прошло сегодня, планируем на завтра
        if (now > next) {
            next.setDate(next.getDate() + 1);
        }

        const diff = next - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { hours, minutes, next };
    }

    /**
     * Инициализация при загрузке страницы
     */
    init(enabled) {
        if (!this.isSupported()) {
            console.warn('⚠️ Push-уведомления не поддерживаются');
            return;
        }

        if (enabled && Notification.permission === 'granted') {
            this.scheduleNotifications();
            console.log('✅ NotificationManager инициализирован');

            const timeUntil = this.getTimeUntilNextNotification();
            console.log(`⏰ Следующее уведомление в ${timeUntil.next.toLocaleTimeString('ru-RU')}`);
        }
    }
}

// Экспортируем глобально
window.NotificationManager = NotificationManager;
