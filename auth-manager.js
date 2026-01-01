/**
 * Authentication Manager
 * Управление входом, регистрацией и состоянием пользователя
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.onAuthStateChangedCallback = null;
    
    // Слушаем изменения состояния аутентификации
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      console.log('Auth state changed:', user ? user.email : 'No user');
      
      if (this.onAuthStateChangedCallback) {
        this.onAuthStateChangedCallback(user);
      }
    });
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
   * Вход с email и паролем
   */
  async signInWithEmail(email, password) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('User signed in:', userCredential.user.email);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
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

// Глобальный экземпляр
window.authManager = new AuthManager();
