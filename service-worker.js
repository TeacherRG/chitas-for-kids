/**
 * SERVICE WORKER для приложения Хитас для детей
 * Обработка push-уведомлений и кэширование для офлайн-режима
 */

'use strict';

const CACHE_NAME = 'chitas-for-kids-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/notification-manager.js',
    '/icon-192.png',
    '/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Установка');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Service Worker: Кэширование файлов');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('❌ Ошибка кэширования:', error);
            })
    );
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: Активирован');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Обработка запросов (стратегия: Network First, затем Cache)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Клонируем ответ для кэша
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                // Если сеть недоступна, возвращаем из кэша
                return caches.match(event.request);
            })
    );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    console.log('🔔 Service Worker: Получено push-уведомление');

    let notificationData = {
        title: '🎓 Хитас для детей',
        body: 'Не забудьте пройти сегодня урок! 📚',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'daily-reminder',
        requireInteraction: false,
        data: {
            url: '/'
        }
    };

    // Если есть данные в push-сообщении, используем их
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = { ...notificationData, ...data };
        } catch (e) {
            console.warn('⚠️ Не удалось распарсить данные push-уведомления:', e);
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            data: notificationData.data,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Открыть приложение'
                },
                {
                    action: 'close',
                    title: 'Закрыть'
                }
            ]
        })
    );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
    console.log('👆 Service Worker: Клик по уведомлению');

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Открываем или фокусируем приложение
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Проверяем, открыто ли уже приложение
                for (const client of clientList) {
                    if (client.url === event.notification.data.url && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Если приложение не открыто, открываем новое окно
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data.url || '/');
                }
            })
    );
});

// Обработка закрытия уведомлений
self.addEventListener('notificationclose', (event) => {
    console.log('❌ Service Worker: Уведомление закрыто пользователем');
});

console.log('🚀 Service Worker загружен');
