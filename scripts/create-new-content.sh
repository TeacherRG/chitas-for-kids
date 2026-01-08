#!/bin/bash

# Скрипт для создания новых файлов контента на основе шаблонов
# Использование: ./scripts/create-new-content.sh [YYYY-MM-DD]
# Если дата не указана, используется ТЕКУЩАЯ дата

set -e

# Определяем дату
if [ -z "$1" ]; then
    DATE=$(date '+%Y-%m-%d')
    echo "⚠️  Дата не указана, используется ТЕКУЩАЯ дата: $DATE"
else
    DATE=$1
fi

CONTENT_FILE="data/${DATE}-content.json"
GAMES_FILE="data/${DATE}-games.json"

echo ""
echo "📅 Создание контента для даты: $DATE"
echo ""

# Проверяем, не существуют ли уже файлы
if [ -f "$CONTENT_FILE" ] || [ -f "$GAMES_FILE" ]; then
    echo "⚠️  ВНИМАНИЕ: Файлы для этой даты уже существуют!"
    if [ -f "$CONTENT_FILE" ]; then
        echo "  - $CONTENT_FILE"
    fi
    if [ -f "$GAMES_FILE" ]; then
        echo "  - $GAMES_FILE"
    fi
    echo ""
    read -p "Перезаписать существующие файлы? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Отменено"
        exit 0
    fi
fi

echo ""
echo "📋 Копирование шаблонов..."

# Копируем шаблоны
cp templates/TEMPLATE-content.json "$CONTENT_FILE"
cp templates/TEMPLATE-games.json "$GAMES_FILE"

echo "✅ Шаблоны скопированы"
echo ""

# Заменяем дату в файлах
echo "📝 Установка даты: $DATE"

# Для macOS используем другой синтаксис sed
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/\"date\": \"YYYY-MM-DD\"/\"date\": \"$DATE\"/g" "$CONTENT_FILE"
    sed -i '' "s/\"date\": \"YYYY-MM-DD\"/\"date\": \"$DATE\"/g" "$GAMES_FILE"
else
    sed -i "s/\"date\": \"YYYY-MM-DD\"/\"date\": \"$DATE\"/g" "$CONTENT_FILE"
    sed -i "s/\"date\": \"YYYY-MM-DD\"/\"date\": \"$DATE\"/g" "$GAMES_FILE"
fi

echo "✅ Дата установлена в обоих файлах"
echo ""

# Проверяем валидность созданных файлов
echo "🔍 Проверка созданных файлов..."
if jq empty "$CONTENT_FILE" 2>/dev/null && jq empty "$GAMES_FILE" 2>/dev/null; then
    echo "✅ JSON валиден"
else
    echo "❌ Ошибка: созданные файлы содержат невалидный JSON"
    exit 1
fi

echo ""
echo "✅ ФАЙЛЫ УСПЕШНО СОЗДАНЫ!"
echo ""
echo "📁 Созданные файлы:"
echo "  - $CONTENT_FILE"
echo "  - $GAMES_FILE"
echo ""
echo "📝 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Откройте $CONTENT_FILE"
echo "   и заполните контент для всех 6 разделов"
echo ""
echo "2. Откройте $GAMES_FILE"
echo "   и создайте игры для каждого раздела"
echo ""
echo "3. ⚠️  ВАЖНО: Для игры Wheel of Fortune используйте формат с 'questions', НЕ 'sectors'!"
echo ""
echo "4. После заполнения проверьте файлы командой:"
echo "   ./scripts/validate-content.sh $DATE"
echo ""
echo "5. Добавьте запись в data/index.json"
echo ""
echo "📖 Инструкции: см. CONTENT_CREATION_INSTRUCTIONS.md"
