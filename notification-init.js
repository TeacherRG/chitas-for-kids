/**
 * NOTIFICATION INITIALIZATION
 * Инициализация и интеграция push-уведомлений с приложением
 */

'use strict';

(function() {
    // Создаем глобальный экземпляр NotificationManager
    window.notificationManager = new NotificationManager();

    /**
     * Регистрация Service Worker
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    console.log('✅ Service Worker зарегистрирован:', registration.scope);
                })
                .catch((error) => {
                    console.error('❌ Ошибка регистрации Service Worker:', error);
                });
        } else {
            console.warn('⚠️ Service Worker не поддерживается в этом браузере');
        }
    }

    /**
     * Инициализация уведомлений при загрузке страницы
     */
    function initNotifications() {
        // Регистрируем Service Worker
        registerServiceWorker();

        // Ждем загрузки приложения
        window.addEventListener('load', () => {
            // Получаем настройки из localStorage
            const savedState = localStorage.getItem('chitasProgress');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const pushEnabled = state.settings?.pushNotifications || false;

                    // Если уведомления включены, инициализируем их
                    if (pushEnabled) {
                        window.notificationManager.init(true);
                    }
                } catch (e) {
                    console.error('Ошибка при загрузке настроек уведомлений:', e);
                }
            }
        });
    }

    /**
     * Обработка переключения настройки уведомлений
     * Эта функция вызывается из app.js при изменении настройки
     */
    window.handleNotificationToggle = async function(enabled) {
        if (enabled) {
            const success = await window.notificationManager.enable();
            if (!success) {
                // Если пользователь отклонил разрешение, отключаем настройку
                return false;
            }
        } else {
            window.notificationManager.disable();
        }
        return true;
    };

    // Запускаем инициализацию
    initNotifications();

    console.log('✅ Notification Init загружен');
})();
