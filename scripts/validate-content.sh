#!/bin/bash

# Скрипт для проверки корректности файлов контента и игр
# Использование: ./scripts/validate-content.sh YYYY-MM-DD

set -e

if [ -z "$1" ]; then
    echo "❌ Ошибка: Не указана дата"
    echo "Использование: $0 YYYY-MM-DD"
    echo "Пример: $0 2026-01-08"
    exit 1
fi

DATE=$1
CONTENT_FILE="data/${DATE}-content.json"
GAMES_FILE="data/${DATE}-games.json"

echo "🔍 Проверка файлов для даты: $DATE"
echo ""

# Проверка существования файлов
echo "📁 Проверка существования файлов..."
if [ ! -f "$CONTENT_FILE" ]; then
    echo "❌ Файл $CONTENT_FILE не найден"
    exit 1
fi
echo "✅ $CONTENT_FILE найден"

if [ ! -f "$GAMES_FILE" ]; then
    echo "❌ Файл $GAMES_FILE не найден"
    exit 1
fi
echo "✅ $GAMES_FILE найден"
echo ""

# Проверка валидности JSON
echo "🔧 Проверка валидности JSON..."
if ! jq empty "$CONTENT_FILE" 2>/dev/null; then
    echo "❌ $CONTENT_FILE содержит невалидный JSON"
    exit 1
fi
echo "✅ $CONTENT_FILE - валидный JSON"

if ! jq empty "$GAMES_FILE" 2>/dev/null; then
    echo "❌ $GAMES_FILE содержит невалидный JSON"
    exit 1
fi
echo "✅ $GAMES_FILE - валидный JSON"
echo ""

# Проверка даты в content.json
echo "📅 Проверка даты в content.json..."
CONTENT_DATE=$(jq -r '.date' "$CONTENT_FILE")
if [ "$CONTENT_DATE" != "$DATE" ]; then
    echo "❌ Дата в content.json ($CONTENT_DATE) не совпадает с ожидаемой ($DATE)"
    exit 1
fi
echo "✅ Дата в content.json корректна: $CONTENT_DATE"

# Проверка даты в games.json
echo "📅 Проверка даты в games.json..."
GAMES_DATE=$(jq -r '.date' "$GAMES_FILE")
if [ "$GAMES_DATE" != "$DATE" ]; then
    echo "❌ Дата в games.json ($GAMES_DATE) не совпадает с ожидаемой ($DATE)"
    exit 1
fi
echo "✅ Дата в games.json корректна: $GAMES_DATE"
echo ""

# Проверка наличия всех разделов в content.json
echo "📚 Проверка наличия всех разделов в content.json..."
SECTIONS=("chumash" "tehillim" "tanya" "hayom-yom" "rambam" "geula")
for section in "${SECTIONS[@]}"; do
    if ! jq -e ".sections[] | select(.id == \"$section\")" "$CONTENT_FILE" > /dev/null; then
        echo "❌ Раздел '$section' не найден в content.json"
        exit 1
    fi
    echo "  ✅ $section"
done
echo ""

# Проверка наличия игр для всех разделов в games.json
echo "🎮 Проверка наличия игр для всех разделов..."
for section in "${SECTIONS[@]}"; do
    if ! jq -e ".games[\"$section\"]" "$GAMES_FILE" > /dev/null; then
        echo "❌ Игры для раздела '$section' не найдены в games.json"
        exit 1
    fi
    GAME_COUNT=$(jq ".games[\"$section\"] | length" "$GAMES_FILE")
    echo "  ✅ $section ($GAME_COUNT игр)"
done
echo ""

# Проверка формата игры Wheel of Fortune
echo "🎡 Проверка формата игры Wheel of Fortune..."
if jq -e '.games.geula[] | select(.type == "wheel")' "$GAMES_FILE" > /dev/null; then
    # Проверяем, что используется "questions", а не "sectors"
    if jq -e '.games.geula[] | select(.type == "wheel") | .sectors' "$GAMES_FILE" > /dev/null 2>&1; then
        echo "❌ Игра Wheel использует СТАРЫЙ формат с 'sectors'!"
        echo "   Нужно использовать 'questions' вместо 'sectors'"
        exit 1
    fi

    if ! jq -e '.games.geula[] | select(.type == "wheel") | .questions' "$GAMES_FILE" > /dev/null; then
        echo "❌ Игра Wheel не содержит поле 'questions'"
        exit 1
    fi

    WHEEL_QUESTIONS=$(jq '.games.geula[] | select(.type == "wheel") | .questions | length' "$GAMES_FILE")
    echo "✅ Игра Wheel of Fortune использует правильный формат ($WHEEL_QUESTIONS вопросов)"

    # Проверяем, что все вопросы имеют options
    QUESTIONS_WITHOUT_OPTIONS=$(jq '[.games.geula[] | select(.type == "wheel") | .questions[] | select(.options == null)] | length' "$GAMES_FILE")
    if [ "$QUESTIONS_WITHOUT_OPTIONS" -gt 0 ]; then
        echo "❌ $QUESTIONS_WITHOUT_OPTIONS вопросов в Wheel не имеют поля 'options'"
        exit 1
    fi
    echo "✅ Все вопросы в Wheel имеют варианты ответа (options)"
else
    echo "⚠️  Игра Wheel of Fortune не найдена в разделе geula"
fi
echo ""

# Проверка всех quiz и wheel игр на наличие options
echo "🎯 Проверка quiz/wheel игр на наличие options..."
QUIZ_GAMES=$(jq '[.games[][] | select(.type == "quiz" or .type == "wheel")] | length' "$GAMES_FILE")
QUIZ_WITHOUT_OPTIONS=$(jq '[.games[][] | select(.type == "quiz" or .type == "wheel") | select(.options == null and .questions == null)] | length' "$GAMES_FILE")

if [ "$QUIZ_WITHOUT_OPTIONS" -gt 0 ]; then
    echo "❌ Найдено $QUIZ_WITHOUT_OPTIONS quiz/wheel игр без поля 'options' или 'questions'"
    exit 1
fi
echo "✅ Все quiz/wheel игры ($QUIZ_GAMES шт.) имеют правильную структуру"
echo ""

# Итоговая статистика
echo "📊 Итоговая статистика:"
echo "  Дата: $DATE"
echo "  Разделов: ${#SECTIONS[@]}"
TOTAL_GAMES=$(jq '[.games[][] | length] | add' "$GAMES_FILE")
echo "  Всего игр: $TOTAL_GAMES"
echo ""

echo "✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!"
echo "✨ Файлы готовы к использованию"
