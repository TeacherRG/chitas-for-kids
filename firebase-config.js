/**
 * Firebase Configuration
 * Конфигурация для проекта Chitas for Kids
 */

// Конфигурация Firebase - ваши реальные данные
const firebaseConfig = {
  apiKey: "AIzaSyDQneMDJ6Hx30G8bIu-XYzfxxNZ1QAW5hM",
  authDomain: "chitas-for-kids.firebaseapp.com",
  projectId: "chitas-for-kids",
  storageBucket: "chitas-for-kids.firebasestorage.app",
  messagingSenderId: "1046909437256",
  appId: "1:1046909437256:web:9771f37f406cc6ab2a9f7d",
  measurementId: "G-S20WBBFK4H"
};

// Инициализация Firebase
// Глобальные переменные для использования в других файлах
var auth, db, googleProvider;

// Проверяем доступность Firebase SDK
if (typeof firebase === 'undefined') {
  console.warn('⚠️ Firebase SDK not loaded - authentication features will be disabled');
  console.log('ℹ️ This does not affect core app functionality');
  // Устанавливаем переменные в undefined для корректной проверки в других модулях
  auth = undefined;
  db = undefined;
  googleProvider = undefined;
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase app initialized successfully');

    // Экспорт сервисов (глобальные переменные)
    auth = firebase.auth();
    db = firebase.firestore();

    // Настройка Google провайдера
    googleProvider = new firebase.auth.GoogleAuthProvider();

    // Проверка подключения к Firestore
    db.enablePersistence({ synchronizeTabs: true })
      .then(() => {
        console.log('✅ Firestore persistence enabled');
      })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('⚠️ Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('⚠️ Persistence not available in this browser');
        }
      });

    console.log('🔥 Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('ℹ️ App will continue without authentication features');
    // НЕ показываем alert, чтобы не пугать пользователя
    // Устанавливаем переменные в undefined
    auth = undefined;
    db = undefined;
    googleProvider = undefined;
  }
}
