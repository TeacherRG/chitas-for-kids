/**
 * ОДНОРАЗОВАЯ МИГРАЦИЯ: Пересчет стриков для всех пользователей
 *
 * Эта функция предназначена для однократного запуска в консоли браузера
 * для пересчета стриков всех пользователей на основе их completed данных.
 *
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Откройте сайт в браузере
 * 2. Откройте консоль разработчика (F12)
 * 3. Вставьте этот код в консоль
 * 4. Выполните: await recalculateAllUserStreaks()
 *
 * ВАЖНО: Функция требует инициализированного Firebase (db должен быть доступен)
 */

/**
 * Форматирует дату в строку формата YYYY-MM-DD
 * @param {Date} date - Дата для форматирования
 * @returns {string} Строка в формате YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Вычисляет текущий стрик на основе completed данных
 * Логика идентична calculateStreak() из achievements-manager.js
 *
 * @param {Object} completed - Объект с пройденными секциями по датам
 * @returns {number} Текущий стрик (количество дней подряд)
 */
function calculateStreakFromCompleted(completed) {
    // Получаем все даты, когда была хоть какая-то активность
    const completedDates = Object.keys(completed)
        .filter(date => Object.keys(completed[date]).length > 0)
        .sort()
        .reverse();

    if (completedDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Проходим от сегодня назад и считаем дни подряд
    for (let i = 0; i < completedDates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = formatDate(checkDate);

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
 * Вычисляет максимальный стрик за все время на основе completed данных
 *
 * @param {Object} completed - Объект с пройденными секциями по датам
 * @returns {number} Максимальный стрик за все время
 */
function calculateMaxStreakFromCompleted(completed) {
    const completedDates = Object.keys(completed)
        .filter(date => Object.keys(completed[date]).length > 0)
        .sort();

    if (completedDates.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const dateStr of completedDates) {
        const currentDate = new Date(dateStr);
        currentDate.setHours(0, 0, 0, 0);

        if (lastDate === null) {
            // Первый день
            currentStreak = 1;
        } else {
            // Проверяем, следующий ли это день
            const expectedDate = new Date(lastDate);
            expectedDate.setDate(expectedDate.getDate() + 1);

            if (currentDate.getTime() === expectedDate.getTime()) {
                currentStreak++;
            } else {
                // Есть пропуск - проверяем, состоит ли он только из суббот
                let gapContainsNonSaturday = false;
                let tempDate = new Date(expectedDate);

                while (tempDate < currentDate) {
                    if (tempDate.getDay() !== 6) {  // Не суббота
                        gapContainsNonSaturday = true;
                        break;
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                }

                if (gapContainsNonSaturday) {
                    // Пропуск содержит не только субботы - стрик прерван
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                } else {
                    // Пропуск содержит только субботы - стрик продолжается
                    currentStreak++;
                }
            }
        }

        lastDate = currentDate;
        maxStreak = Math.max(maxStreak, currentStreak);
    }

    return maxStreak;
}

/**
 * ГЛАВНАЯ ФУНКЦИЯ: Пересчитывает стрики для всех пользователей
 *
 * Эта функция:
 * 1. Загружает всех пользователей из Firebase
 * 2. Для каждого пользователя пересчитывает currentStreak и maxStreak
 * 3. Обновляет данные в Firebase
 * 4. Выводит подробный отчет о проделанной работе
 *
 * @returns {Promise<Object>} Объект с результатами миграции
 */
async function recalculateAllUserStreaks() {
    console.log('🔄 Начинаем пересчет стриков для всех пользователей...\n');

    // Проверяем доступность Firebase
    if (typeof db === 'undefined') {
        console.error('❌ Firebase Firestore не инициализирован!');
        console.error('Убедитесь, что вы находитесь на странице приложения и Firebase загружен.');
        return {
            success: false,
            error: 'Firebase not initialized'
        };
    }

    try {
        // Загружаем всех пользователей из Firebase
        console.log('📥 Загружаем данные пользователей из Firebase...');
        const snapshot = await db.collection('userProgress').get();

        const totalUsers = snapshot.size;
        console.log(`📊 Найдено пользователей: ${totalUsers}\n`);

        if (totalUsers === 0) {
            console.log('ℹ️ Нет пользователей для обработки.');
            return {
                success: true,
                processed: 0,
                updated: 0,
                errors: 0
            };
        }

        let processed = 0;
        let updated = 0;
        let errors = 0;
        const updateLog = [];

        // Обрабатываем каждого пользователя
        for (const doc of snapshot.docs) {
            const userId = doc.id;
            const userData = doc.data();
            processed++;

            try {
                console.log(`\n[${processed}/${totalUsers}] 👤 Обработка пользователя: ${userId}`);

                // Получаем данные
                const completed = userData.completed || {};
                const oldCurrentStreak = userData.currentStreak || 0;
                const oldMaxStreak = userData.maxStreak || 0;

                // Вычисляем новые стрики
                const newCurrentStreak = calculateStreakFromCompleted(completed);
                const calculatedMaxStreak = calculateMaxStreakFromCompleted(completed);

                // maxStreak должен быть максимумом из старого значения и вычисленного
                // (на случай если у пользователя был рекорд в прошлом)
                const newMaxStreak = Math.max(oldMaxStreak, calculatedMaxStreak, newCurrentStreak);

                // Логируем изменения
                console.log(`  📊 Старые значения: currentStreak=${oldCurrentStreak}, maxStreak=${oldMaxStreak}`);
                console.log(`  ✨ Новые значения: currentStreak=${newCurrentStreak}, maxStreak=${newMaxStreak}`);

                // Проверяем, нужно ли обновление
                const needsUpdate = (oldCurrentStreak !== newCurrentStreak) || (oldMaxStreak !== newMaxStreak);

                if (needsUpdate) {
                    // Обновляем данные в Firebase
                    await db.collection('userProgress').doc(userId).update({
                        currentStreak: newCurrentStreak,
                        maxStreak: newMaxStreak,
                        lastStreakRecalculation: new Date().toISOString()
                    });

                    updated++;
                    console.log(`  ✅ Обновлено в Firebase`);

                    updateLog.push({
                        userId,
                        oldCurrentStreak,
                        newCurrentStreak,
                        oldMaxStreak,
                        newMaxStreak,
                        completedDays: Object.keys(completed).length
                    });
                } else {
                    console.log(`  ℹ️ Обновление не требуется (стрики уже корректны)`);
                }

            } catch (error) {
                errors++;
                console.error(`  ❌ Ошибка при обработке пользователя ${userId}:`, error);
            }
        }

        // Итоговый отчет
        console.log('\n' + '='.repeat(60));
        console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
        console.log('='.repeat(60));
        console.log(`✅ Успешно обработано: ${processed} пользователей`);
        console.log(`🔄 Обновлено в базе: ${updated} пользователей`);
        console.log(`❌ Ошибок: ${errors}`);
        console.log('='.repeat(60));

        if (updateLog.length > 0) {
            console.log('\n📋 ДЕТАЛЬНЫЙ ЛОГ ИЗМЕНЕНИЙ:');
            console.table(updateLog);
        }

        return {
            success: true,
            processed,
            updated,
            errors,
            updateLog
        };

    } catch (error) {
        console.error('❌ Критическая ошибка при пересчете стриков:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Экспортируем функцию для использования
if (typeof window !== 'undefined') {
    window.recalculateAllUserStreaks = recalculateAllUserStreaks;
    console.log('✅ Функция recalculateAllUserStreaks() доступна в глобальной области');
}
