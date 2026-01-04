#!/bin/bash
# Скрипт быстрого деплоя Firebase

echo "🚀 Деплой изменений в Firebase"
echo "================================"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js установлен: $(node --version)"

# Установка Firebase CLI
echo ""
echo "📦 Установка Firebase CLI..."
npm install -g firebase-tools

# Проверка установки
if ! command -v firebase &> /dev/null; then
    echo "❌ Не удалось установить Firebase CLI"
    exit 1
fi

echo "✅ Firebase CLI установлен: $(firebase --version)"

# Вход в Firebase
echo ""
echo "🔐 Вход в Firebase аккаунт..."
firebase login --no-localhost

# Инициализация проекта
echo ""
echo "🔧 Инициализация Firebase проекта..."

# Создание .firebaserc
cat > .firebaserc << 'EOF'
{
  "projects": {
    "default": "chitas-for-kids"
  }
}
EOF

echo "✅ Конфигурация создана"

# Деплой Firestore Rules
echo ""
echo "📤 Деплой Firestore Rules..."
firebase deploy --only firestore:rules

# Деплой Hosting
echo ""
read -p "Деплоить Hosting (код приложения)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Деплой Hosting..."
    firebase deploy --only hosting
fi

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "🔍 Проверьте результат:"
echo "1. Firestore Rules: https://console.firebase.google.com/project/chitas-for-kids/firestore/rules"
echo "2. Hosting: https://console.firebase.google.com/project/chitas-for-kids/hosting"
