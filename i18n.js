/**
 * INTERNATIONALIZATION MODULE
 * Multi-language support with Gemini API translation
 */

'use strict';

class I18n {
    constructor() {
        this.GEMINI_API_KEY = 'AIzaSyAnuW56wUaAcKikopTWGsFeSdYChBH2vAg';
        this.GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

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
     * Translate text using Gemini API
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

        const targetLangName = this.LANGUAGES[targetLang].nativeName;

        const prompt = `You are translating Jewish educational content from Russian to ${targetLangName}.

CRITICAL INSTRUCTIONS:
1. Keep ALL Hebrew text EXACTLY as written (ב״ה, Hebrew dates, Hebrew names, Torah portions)
2. Keep Jewish terms in their transliterated form (Chumash, Rashi, Tehillim, Tanya, etc.)
3. Preserve all emoji and special characters
4. Keep numbers and punctuation as they are
5. Maintain respectful and appropriate religious terminology
6. Do NOT translate Hebrew names of people or places
7. Do NOT translate names of Torah portions (parshas)
8. Do NOT translate sacred Hebrew terms

Examples of what to preserve:
- ב״ה (always keep as is)
- Hebrew dates: כ״ח כסלו ה׳תשפ״ו
- Names: Яаков (Jacob), Йосеф (Joseph)
- Torah portions: Ваехи, Берешит
- Hebrew terms in Russian text

Return ONLY the translation, without any explanations or additional text.

Text to translate:
${text}`;

        try {
            const response = await fetch(`${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const translatedText = data.candidates[0].content.parts[0].text.trim();

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
