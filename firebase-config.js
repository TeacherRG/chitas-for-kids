/**
 * Firebase Configuration
 * Конфигурация для проекта Chitas for Kids
 */

// Конфигурация Firebase - ваши реальные данные
const firebaseConfig = {
  apiKey: "AIzaSyDQneMDJ6Hx30G8bIu-XYzfxxNZ1QAW5hM",
  authDomain: "mychitas.app",
  projectId: "chitas-for-kids",
  storageBucket: "chitas-for-kids.firebasestorage.app",
  messagingSenderId: "1046909437256",
  appId: "1:1046909437256:web:9771f37f406cc6ab2a9f7d",
  measurementId: "G-S20WBBFK4H"
};

// Инициализация Firebase
const app = firebase.initializeApp(firebaseConfig);

// Инициализация Firebase Analytics для отслеживания статистики
const analytics = firebase.analytics();

// Экспорт сервисов
const auth = firebase.auth();
const db = firebase.firestore();

// Настройка Google провайдера
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log('🔥 Firebase initialized successfully');
console.log('📊 Firebase Analytics enabled');
