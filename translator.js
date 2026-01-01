/**
 * ב״ה
 * AI Translator for Chitas for Kids
 * Умный переводчик на базе Gemini API с сохранением религиозных терминов
 */

class ChitasTranslator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.currentLang = localStorage.getItem('chitas_language') || 'ru';
        this.cache = this.loadCache();
        this.isTranslating = false;

        // Религиозные термины, которые НЕ переводятся
        this.preservedTerms = [
            'Тора', 'Хитас', 'Хумаш', 'Тегилим', 'Танья', 'Гаём Йом',
            'Рамбам', 'Геула', 'Ребе', 'мицва', 'мицвот', 'Шма',
            'Шаббат', 'Шабос', 'Хабад', 'Любавичер', 'Алтер Ребе',
            'Маймонид', 'Раши', 'Давид а-Мелех', 'Моше Рабейну',
            'б-г', 'Б-г', 'Вс-вышний', 'Творец', 'Машиах'
        ];

        // Языки с именами
        this.languages = {
            'ru': { name: 'Русский', flag: '🇷🇺', native: 'Русский' },
            'en': { name: 'English', flag: '🇬🇧', native: 'английский' },
            'he': { name: 'עברית', flag: '🇮🇱', native: 'иврит' },
            'yi': { name: 'ייִדיש', flag: '🇮🇱', native: 'идиш' },
            'fr': { name: 'Français', flag: '🇫🇷', native: 'французский' },
            'es': { name: 'Español', flag: '🇪🇸', native: 'испанский' }
        };

        this.init();
    }

    init() {
        // НЕ переводим автоматически - ждём действия пользователя
        console.log('ChitasTranslator initialized, current language:', this.currentLang);
    }

    // Загрузка кэша из localStorage
    loadCache() {
        try {
            const cached = localStorage.getItem('chitas_translation_cache');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            console.error('Ошибка загрузки кэша переводов:', e);
            return {};
        }
    }

    // Сохранение кэша
    saveCache() {
        try {
            localStorage.setItem('chitas_translation_cache', JSON.stringify(this.cache));
        } catch (e) {
            console.error('Ошибка сохранения кэша:', e);
        }
    }

    // Главная функция перевода всей страницы
    async translatePage(targetLang) {
        if (this.isTranslating) {
            console.log('Перевод уже выполняется...');
            return;
        }

        if (targetLang === 'ru') {
            this.resetToRussian();
            return;
        }

        this.isTranslating = true;
        this.showLoadingIndicator();

        try {
            // 1. Переводим UI элементы
            await this.translateUI(targetLang);

            // 2. Переводим текущий контент урока
            await this.translateCurrentLesson(targetLang);

            this.showSuccess(`Переведено на ${this.languages[targetLang].name}`);
        } catch (error) {
            console.error('Ошибка перевода:', error);
            this.showError('Ошибка перевода. Попробуйте снова.');
        } finally {
            this.isTranslating = false;
            this.hideLoadingIndicator();
        }
    }

    // Сброс на русский (оригинал)
    resetToRussian() {
        this.currentLang = 'ru';
        localStorage.setItem('chitas_language', 'ru');
        location.reload(); // Перезагружаем страницу для возврата к оригиналу
    }

    // Перевод элементов интерфейса
    async translateUI(targetLang) {
        // Переводим все элементы с data-i18n
        const elements = document.querySelectorAll('[data-i18n]');

        for (const element of elements) {
            const key = element.getAttribute('data-i18n');
            const originalText = element.getAttribute('data-i18n-original') || element.textContent;

            // Сохраняем оригинал если ещё не сохранён
            if (!element.getAttribute('data-i18n-original')) {
                element.setAttribute('data-i18n-original', originalText);
            }

            // Переводим
            const translated = await this.translateText(originalText, targetLang, 'ui');
            element.textContent = translated;
        }
    }

    // Перевод текущего урока
    async translateCurrentLesson(targetLang) {
        // Проверяем, есть ли загруженный урок
        if (!window.chitasApp || !window.chitasApp.contentData) {
            console.log('Данные ещё не загружены, перевод будет выполнен при открытии секции');
            return;
        }

        const app = window.chitasApp;

        // Переводим содержимое секций
        if (app.contentData && app.contentData.sections) {
            for (const section of app.contentData.sections) {
                // Переводим заголовок секции
                if (section.title) {
                    section.title = await this.translateText(section.title, targetLang, 'lesson');
                }

                // Переводим параграфы внутри секции
                if (section.content && section.content.paragraphs) {
                    for (const para of section.content.paragraphs) {
                        if (para.title) {
                            para.title = await this.translateText(para.title, targetLang, 'lesson');
                        }
                        if (para.text) {
                            para.text = await this.translateText(para.text, targetLang, 'lesson');
                        }
                    }
                }
            }
        }

        // Переводим данные игр
        if (app.gamesData && app.gamesData.games) {
            for (const sectionKey in app.gamesData.games) {
                const games = app.gamesData.games[sectionKey];
                for (const game of games) {
                    await this.translateGameData(game, targetLang);
                }
            }
        }

        // Перерисовываем страницу с переведёнными данными
        if (typeof app.renderPage === 'function') {
            app.renderPage();
        }
    }

    // Перевод данных игры
    async translateGameData(game, targetLang) {
        if (!game) return;

        if (game.title) {
            game.title = await this.translateText(game.title, targetLang, 'game');
        }
        if (game.question) {
            game.question = await this.translateText(game.question, targetLang, 'game');
        }
        if (game.explanation) {
            game.explanation = await this.translateText(game.explanation, targetLang, 'game');
        }

        // Переводим опции для викторин
        if (game.options && Array.isArray(game.options)) {
            game.options = await Promise.all(
                game.options.map(opt => this.translateText(opt, targetLang, 'game'))
            );
        }

        // Переводим вопросы для игр правда/ложь
        if (game.questions && Array.isArray(game.questions)) {
            for (const q of game.questions) {
                if (q.statement) {
                    q.statement = await this.translateText(q.statement, targetLang, 'game');
                }
                if (q.text) {
                    q.text = await this.translateText(q.text, targetLang, 'game');
                }
                if (q.explanation) {
                    q.explanation = await this.translateText(q.explanation, targetLang, 'game');
                }
            }
        }

        // Переводим пары для игры "Найди пару"
        if (game.pairs && Array.isArray(game.pairs)) {
            for (const pair of game.pairs) {
                if (pair.left) {
                    pair.left = await this.translateText(pair.left, targetLang, 'game');
                }
                if (pair.right) {
                    pair.right = await this.translateText(pair.right, targetLang, 'game');
                }
            }
        }
    }

    // Основная функция перевода текста через AI
    async translateText(text, targetLang, context = 'general') {
        if (!text || typeof text !== 'string') return text;

        const cacheKey = `${text.substring(0, 50)}_${targetLang}_${context}`;

        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        try {
            const result = await this.translateWithAI(text, targetLang, context);
            this.cache[cacheKey] = result;
            this.saveCache();
            return result;
        } catch (error) {
            console.error('Ошибка перевода текста:', error);
            return text; // Возвращаем оригинал при ошибке
        }
    }

    // Перевод через Gemini API
    async translateWithAI(content, targetLang, context) {
        const textToTranslate = content;

        const contextPrompts = {
            ui: 'Это элементы интерфейса детского образовательного приложения о еврейской традиции.',
            lesson: 'Это текст урока из священных еврейских текстов (Тора, Тегилим, Танья).',
            explanation: 'Это детское объяснение еврейского религиозного текста для детей 6-12 лет.',
            game: 'Это вопросы образовательной игры о еврейской традиции для детей.',
            general: 'Это текст для детского еврейского образовательного приложения.'
        };

        const prompt = `Переведи следующий текст на ${this.languages[targetLang].native} язык.

КОНТЕКСТ: ${contextPrompts[context]}

ВАЖНЫЕ ПРАВИЛА:
1. НЕ ПЕРЕВОДИ религиозные термины: ${this.preservedTerms.join(', ')}
2. Сохраняй ивритские слова как есть
3. Адаптируй для детей 6-12 лет (если это объяснение)
4. Сохраняй эмодзи и форматирование
5. Верни только переведённый текст
6. Если имя собственное (персонаж) - оставь как есть

ТЕКСТ ДЛЯ ПЕРЕВОДА:
${textToTranslate}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
            {
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
                        temperature: 0.3, // Низкая температура для точности
                        topK: 40,
                        topP: 0.95,
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API ошибка: ${response.status}`);
        }

        const data = await response.json();
        let translatedText = data.candidates[0].content.parts[0].text;

        // Очищаем от markdown обёрток если есть
        translatedText = translatedText.replace(/```\n?/g, '').trim();

        return translatedText;
    }

    // UI индикаторы
    showLoadingIndicator() {
        let indicator = document.getElementById('translation-loader');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'translation-loader';
            indicator.innerHTML = `
                <div class="translation-spinner">
                    <div class="spinner"></div>
                    <div>Перевод...</div>
                </div>
            `;
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('translation-loader');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `translation-toast translation-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Создание UI переключателя языков
    createLanguageSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <button class="lang-btn" data-lang="ru" title="Русский">
                ${this.languages.ru.flag}
            </button>
            <button class="lang-btn" data-lang="en" title="English">
                ${this.languages.en.flag}
            </button>
            <button class="lang-btn" data-lang="he" title="עברית">
                ${this.languages.he.flag}
            </button>
            <button class="lang-btn" data-lang="yi" title="ייִדיש">
                🕎
            </button>
            <button class="lang-btn" data-lang="fr" title="Français">
                ${this.languages.fr.flag}
            </button>
            <button class="lang-btn" data-lang="es" title="Español">
                ${this.languages.es.flag}
            </button>
        `;

        // Добавляем обработчики
        switcher.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lang = btn.dataset.lang;

                // Обновляем активную кнопку сразу
                switcher.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Сохраняем язык
                this.currentLang = lang;
                localStorage.setItem('chitas_language', lang);

                // Переводим
                await this.translatePage(lang);
            });

            // Отмечаем текущий язык
            if (btn.dataset.lang === this.currentLang) {
                btn.classList.add('active');
            }
        });

        return switcher;
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChitasTranslator;
}
