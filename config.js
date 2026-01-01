/**
 * ב״ה
 * Конфигурация для Chitas for Kids
 */

// Gemini API ключ для переводов
const GEMINI_API_KEY = 'AIzaSyAnuW56wUaAcKikopTWGsFeSdYChBH2vAg';

// Настройки переводчика
const TRANSLATOR_SETTINGS = {
    defaultLanguage: 'ru',
    enableCaching: true,
    autoTranslate: false, // Автоматически переводить при смене даты
    preferredLanguages: ['en', 'he', 'yi'] // Предзагружаемые языки
};
