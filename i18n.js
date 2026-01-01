/**
 * INTERNATIONALIZATION MODULE
 * Multi-language support with Google Translate API
 */

'use strict';

class I18n {
    constructor() {
        // Google Translate API endpoint (free, no key required)
        this.TRANSLATE_API_URL = 'https://translate.googleapis.com/translate_a/single';

        // Supported languages
        this.LANGUAGES = {
            ru: { name: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
            en: { name: 'English', flag: '🇬🇧', nativeName: 'English' },
            uk: { name: 'Ukrainian', flag: '🇺🇦', nativeName: 'Українська' },
            de: { name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
            he: { name: 'Hebrew', flag: '🇮🇱', nativeName: 'עברית' }
        };

        this.currentLang = this.detectLanguage();
        this.translations = this.loadTranslationsFromCache();
        this.translationQueue = [];
        this.isTranslating = false;
    }

    /**
     * Detect browser language and return supported language code
     */
    detectLanguage() {
        // Check saved preference first
        const saved = localStorage.getItem('chitasLanguage');
        if (saved && this.LANGUAGES[saved]) {
            return saved;
        }

        // Detect browser language
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();

        // If language is Russian, return Russian
        if (langCode === 'ru') {
            return 'ru';
        }

        // If language is supported, return it
        if (this.LANGUAGES[langCode]) {
            return langCode;
        }

        // Otherwise, default to English
        return 'en';
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Set current language
     */
    setLanguage(langCode) {
        if (!this.LANGUAGES[langCode]) {
            console.warn(`Language ${langCode} not supported`);
            return;
        }

        this.currentLang = langCode;
        localStorage.setItem('chitasLanguage', langCode);

        // Update HTML lang attribute
        document.documentElement.lang = langCode;

        // Update direction for Hebrew
        if (langCode === 'he') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
    }

    /**
     * Load translations from localStorage cache
     */
    loadTranslationsFromCache() {
        try {
            const cached = localStorage.getItem('chitasTranslations');
            const cacheData = cached ? JSON.parse(cached) : {};

            // Check cache version
            const cacheVersion = localStorage.getItem('chitasTranslationsVersion') || '1.0';
            const currentVersion = '1.0';

            if (cacheVersion !== currentVersion) {
                console.log('Cache version mismatch, clearing cache');
                this.clearCache();
                return {};
            }

            return cacheData;
        } catch (e) {
            console.error('Failed to load translations from cache:', e);
            // If cache is corrupted, clear it
            this.clearCache();
            return {};
        }
    }

    /**
     * Save translations to localStorage cache
     * Uses monitoring to avoid quota exceeded errors
     */
    saveTranslationsToCache() {
        try {
            const cacheString = JSON.stringify(this.translations);
            const cacheSize = new Blob([cacheString]).size;

            // Check if cache is getting too large (> 4MB)
            if (cacheSize > 4 * 1024 * 1024) {
                console.warn('Translation cache is large, pruning old entries');
                this.pruneCache();
            }

            localStorage.setItem('chitasTranslations', cacheString);
            localStorage.setItem('chitasTranslationsVersion', '1.0');
            localStorage.setItem('chitasTranslationsLastUpdate', new Date().toISOString());

            // Log cache statistics
            if (Math.random() < 0.1) { // Log 10% of the time to avoid spam
                console.log(`Cache: ${Object.keys(this.translations).length} entries, ${(cacheSize / 1024).toFixed(2)} KB`);
            }
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, pruning cache');
                this.pruneCache();
                // Try again after pruning
                try {
                    localStorage.setItem('chitasTranslations', JSON.stringify(this.translations));
                } catch (e2) {
                    console.error('Failed to save even after pruning:', e2);
                }
            } else {
                console.error('Failed to save translations to cache:', e);
            }
        }
    }

    /**
     * Prune cache to keep only most recent entries
     */
    pruneCache() {
        const entries = Object.entries(this.translations);
        // Keep only first 1000 entries
        const pruned = Object.fromEntries(entries.slice(0, 1000));
        this.translations = pruned;
        console.log('Cache pruned to 1000 entries');
    }

    /**
     * Get translation key for caching
     */
    getTranslationKey(text, targetLang) {
        // Create a simple hash of the text for the key
        const hash = this.simpleHash(text);
        return `${hash}_${targetLang}`;
    }

    /**
     * Simple hash function for creating cache keys
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Translate text using Google Translate API
     */
    async translateWithGemini(text, targetLang) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        // If target language is Russian, return original
        if (targetLang === 'ru') {
            return text;
        }

        // Check cache first
        const cacheKey = this.getTranslationKey(text, targetLang);
        if (this.translations[cacheKey]) {
            return this.translations[cacheKey];
        }

        try {
            // Use Google Translate API
            const params = new URLSearchParams({
                client: 'gtx',
                sl: 'ru',
                tl: targetLang,
                dt: 't',
                q: text
            });

            const response = await fetch(`${this.TRANSLATE_API_URL}?${params}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`Translation API error: ${response.status}`);
            }

            const data = await response.json();

            // Google Translate returns array of translated segments
            // Format: [[[translated_text, original_text, null, null, ...]], ...]
            let translatedText = '';
            if (data && data[0]) {
                translatedText = data[0].map(segment => segment[0]).join('');
            }

            if (!translatedText) {
                throw new Error('Empty translation response');
            }

            // Cache the translation
            this.translations[cacheKey] = translatedText;
            this.saveTranslationsToCache();

            return translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text on error
        }
    }

    /**
     * Translate an object recursively
     */
    async translateObject(obj, targetLang) {
        if (targetLang === 'ru') {
            return obj;
        }

        if (typeof obj === 'string') {
            return await this.translateWithGemini(obj, targetLang);
        }

        if (Array.isArray(obj)) {
            const translated = [];
            for (const item of obj) {
                translated.push(await this.translateObject(item, targetLang));
            }
            return translated;
        }

        if (typeof obj === 'object' && obj !== null) {
            const translated = {};
            for (const [key, value] of Object.entries(obj)) {
                translated[key] = await this.translateObject(value, targetLang);
            }
            return translated;
        }

        return obj;
    }

    /**
     * Translate UI elements in the DOM
     */
    async translateUI() {
        if (this.currentLang === 'ru') {
            return;
        }

        const elements = document.querySelectorAll('[data-i18n]');

        for (const element of elements) {
            const key = element.getAttribute('data-i18n');
            const originalText = element.getAttribute('data-i18n-original') || element.textContent;

            // Save original text if not saved
            if (!element.getAttribute('data-i18n-original')) {
                element.setAttribute('data-i18n-original', originalText);
            }

            const translated = await this.translateWithGemini(originalText, this.currentLang);
            element.textContent = translated;
        }
    }

    /**
     * Translate element with original text preserved
     */
    async translateElement(element, originalText = null) {
        if (this.currentLang === 'ru') {
            if (originalText) {
                element.textContent = originalText;
            }
            return;
        }

        const text = originalText || element.getAttribute('data-i18n-original') || element.textContent;

        if (!element.getAttribute('data-i18n-original') && !originalText) {
            element.setAttribute('data-i18n-original', text);
        }

        const translated = await this.translateWithGemini(text, this.currentLang);
        element.textContent = translated;
    }

    /**
     * Get static UI translations
     */
    getStaticTranslations() {
        return {
            ru: {
                home: 'Главная',
                profile: 'Профиль',
                settings: 'Настройки',
                print: 'Печать',
                loading: 'Загрузка...',
                prev: 'Пред',
                next: 'След',
                today: 'Сегодня',
                back: 'Назад',
                points: 'Баллы',
                stars: 'Звёзды',
                completed: 'Пройдено',
                myProfile: 'Мой профиль',
                totalPoints: 'Всего баллов',
                totalStars: 'Всего звёзд',
                daysStreak: 'Дней подряд',
                achievements: 'Достижения',
                sound: 'Звук',
                soundEffects: 'Звуковые эффекты',
                animations: 'Анимации',
                smoothTransitions: 'Плавные переходы',
                darkMode: 'Тёмная тема',
                eveningMode: 'Режим для вечера',
                resetProgress: 'Сбросить прогресс',
                startOver: 'Начать заново',
                firstWeek: 'Первая неделя',
                study7Days: 'Изучай 7 дней подряд',
                onFire: 'В огне',
                study14Days: '14 дней подряд',
                starry: 'Звёздный',
                collect30Stars: 'Собери 30 звёзд',
                champion: 'Чемпион',
                earn500Points: '500 баллов'
            }
        };
    }

    /**
     * Translate static UI text by key
     */
    async t(key) {
        if (this.currentLang === 'ru') {
            const translations = this.getStaticTranslations();
            return translations.ru[key] || key;
        }

        const translations = this.getStaticTranslations();
        const ruText = translations.ru[key];

        if (!ruText) {
            return key;
        }

        return await this.translateWithGemini(ruText, this.currentLang);
    }

    /**
     * Clear translation cache
     */
    clearCache() {
        this.translations = {};
        localStorage.removeItem('chitasTranslations');
    }
}

// Create global instance
window.i18n = new I18n();
