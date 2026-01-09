/**
 * Authentication Manager
 * Управление входом, регистрацией и состоянием пользователя
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.onAuthStateChangedCallback = null;

    // Rate limiting для защиты от brute force
    this.loginAttempts = new Map(); // email -> {count, timestamp, blockedUntil}
    this.MAX_ATTEMPTS = 5; // Максимум попыток
    this.BLOCK_DURATION = 15 * 60 * 1000; // 15 минут блокировки
    this.ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 минут для сброса счетчика

    // Проверяем доступность Firebase auth перед использованием
    if (typeof auth !== 'undefined' && auth) {
      // Слушаем изменения состояния аутентификации
      auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        console.log('Auth state changed:', user ? 'Authenticated' : 'Not authenticated');

        if (this.onAuthStateChangedCallback) {
          this.onAuthStateChangedCallback(user);
        }
      });
    } else {
      console.warn('⚠️ Firebase Auth not available - authentication features disabled');
    }
  }

  /**
   * Проверка rate limit для email
   */
  checkRateLimit(email) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email);

    if (!attempts) {
      return { allowed: true };
    }

    // Проверка блокировки
    if (attempts.blockedUntil && now < attempts.blockedUntil) {
      const remainingMinutes = Math.ceil((attempts.blockedUntil - now) / 60000);
      return {
        allowed: false,
        reason: `Слишком много попыток входа. Повторите через ${remainingMinutes} мин.`
      };
    }

    // Сброс счетчика если прошло достаточно времени
    if (now - attempts.timestamp > this.ATTEMPT_WINDOW) {
      this.loginAttempts.delete(email);
      return { allowed: true };
    }

    // Проверка количества попыток
    if (attempts.count >= this.MAX_ATTEMPTS) {
      const blockedUntil = now + this.BLOCK_DURATION;
      this.loginAttempts.set(email, {
        ...attempts,
        blockedUntil
      });
      return {
        allowed: false,
        reason: 'Слишком много попыток входа. Повторите через 15 минут.'
      };
    }

    return { allowed: true };
  }

  /**
   * Регистрация неудачной попытки входа
   */
  registerFailedAttempt(email) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email);

    if (!attempts) {
      this.loginAttempts.set(email, {
        count: 1,
        timestamp: now,
        blockedUntil: null
      });
    } else {
      this.loginAttempts.set(email, {
        count: attempts.count + 1,
        timestamp: now,
        blockedUntil: attempts.blockedUntil
      });
    }
  }

  /**
   * Сброс счетчика при успешном входе
   */
  resetAttempts(email) {
    this.loginAttempts.delete(email);
  }

  /**
   * Регистрация с email и паролем
   */
  async signUpWithEmail(email, password, displayName) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Обновляем профиль с именем
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
      
      console.log('User registered:', userCredential.user.email);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Вход с email и паролем (с защитой от brute force)
   */
  async signInWithEmail(email, password) {
    // Проверка rate limit
    const rateLimitCheck = this.checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.reason };
    }

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('User signed in successfully');

      // Сброс счетчика при успешном входе
      this.resetAttempts(email);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error.code);

      // Регистрация неудачной попытки
      this.registerFailedAttempt(email);

      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Вход через Google
   */
  async signInWithGoogle() {
    try {
      const result = await auth.signInWithPopup(googleProvider);
      console.log('User signed in with Google:', result.user.email);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Выход
   */
  async signOut() {
    try {
      await auth.signOut();
      console.log('User signed out');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Сброс пароля
   */
  async resetPassword(email) {
    try {
      await auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  /**
   * Проверка, авторизован ли пользователь
   */
  isSignedIn() {
    return this.currentUser !== null;
  }

  /**
   * Получить текущего пользователя
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Получить UID пользователя
   */
  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  /**
   * Получить имя пользователя
   */
  getUserName() {
    if (!this.currentUser) return null;
    return this.currentUser.displayName || this.currentUser.email.split('@')[0];
  }

  /**
   * Установить callback для изменения состояния
   */
  onAuthStateChanged(callback) {
    this.onAuthStateChangedCallback = callback;
  }

  /**
   * Перевод ошибок Firebase на русский
   */
  getErrorMessage(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'Этот email уже используется',
      'auth/invalid-email': 'Неверный формат email',
      'auth/operation-not-allowed': 'Операция не разрешена',
      'auth/weak-password': 'Слишком слабый пароль (минимум 6 символов)',
      'auth/user-disabled': 'Пользователь заблокирован',
      'auth/user-not-found': 'Пользователь не найден',
      'auth/wrong-password': 'Неверный пароль',
      'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
      'auth/network-request-failed': 'Ошибка сети. Проверьте подключение',
      'auth/popup-closed-by-user': 'Окно входа было закрыто'
    };

    return errorMessages[error.code] || error.message;
  }
}

// Глобальный экземпляр - обернут в try-catch для предотвращения сбоя приложения
try {
  window.authManager = new AuthManager();
  console.log('✅ AuthManager initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize AuthManager:', error);
  // Создаем пустой объект для предотвращения ошибок в других частях приложения
  window.authManager = null;
}
