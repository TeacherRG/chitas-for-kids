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
  alert('❌ Ошибка инициализации Firebase. Проверьте консоль для деталей.');
}
