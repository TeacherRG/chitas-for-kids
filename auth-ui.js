/**
 * Auth UI Functions
 * Функции для управления UI аутентификации
 */

// Отображение кнопки входа или информации о пользователе
function renderAuthUI() {
  const container = document.getElementById('authContainer');
  
  if (window.authManager && window.authManager.isSignedIn()) {
    const user = window.authManager.getCurrentUser();
    const userName = window.authManager.getUserName();
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';
    
    container.innerHTML = `
      <div class="user-info">
        <div class="user-avatar">${initial}</div>
        <div class="user-name">${userName}</div>
        <button class="logout-btn" onclick="handleSignOut()">Выйти</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="auth-button" onclick="openAuthModal()">Войти</button>
    `;
  }
}

// Открыть модальное окно
function openAuthModal() {
  document.getElementById('authModal').classList.add('show');
  showSignInForm();
}

// Закрыть модальное окно
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
  hideError();
}

// Показать форму входа
function showSignInForm() {
  document.getElementById('modalTitle').textContent = 'Вход';
  document.getElementById('signInForm').style.display = 'block';
  document.getElementById('signUpForm').style.display = 'none';
  document.getElementById('resetPasswordForm').style.display = 'none';
  hideError();
}

// Показать форму регистрации
function showSignUpForm() {
  document.getElementById('modalTitle').textContent = 'Регистрация';
  document.getElementById('signInForm').style.display = 'none';
  document.getElementById('signUpForm').style.display = 'block';
  document.getElementById('resetPasswordForm').style.display = 'none';
  hideError();
}

// Показать форму сброса пароля
function showResetPassword() {
  document.getElementById('modalTitle').textContent = 'Сброс пароля';
  document.getElementById('signInForm').style.display = 'none';
  document.getElementById('signUpForm').style.display = 'none';
  document.getElementById('resetPasswordForm').style.display = 'block';
  hideError();
}

// Показать ошибку
function showError(message) {
  const errorDiv = document.getElementById('modalError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Скрыть ошибку
function hideError() {
  const errorDiv = document.getElementById('modalError');
  errorDiv.style.display = 'none';
}

// Показать загрузку
function showLoading(button, text = 'Загрузка...') {
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = text;
}

// Скрыть загрузку
function hideLoading(button) {
  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

// Обработчик входа через email
async function handleEmailSignIn(event) {
  event.preventDefault();

  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    showError('Заполните все поля');
    return;
  }

  const button = event.target;
  showLoading(button, 'Вход...');

  const result = await window.authManager.signInWithEmail(email, password);

  hideLoading(button);

  if (result.success) {
    closeAuthModal();
    // Загружаем прогресс из облака (тихо, без сообщений для новых пользователей)
    if (window.chitasApp && window.chitasApp.achievementsManager) {
      await window.chitasApp.achievementsManager.loadFromFirebase(true);
    }
  } else {
    showError(result.error);
  }
}

// Обработчик регистрации через email
async function handleEmailSignUp(event) {
  event.preventDefault();

  const name = document.getElementById('nameInput').value.trim();
  const email = document.getElementById('signUpEmail').value.trim();
  const password = document.getElementById('signUpPassword').value;

  if (!name || !email || !password) {
    showError('Заполните все поля');
    return;
  }

  if (password.length < 6) {
    showError('Пароль должен быть не менее 6 символов');
    return;
  }

  const button = event.target;
  showLoading(button, 'Регистрация...');

  const result = await window.authManager.signUpWithEmail(email, password, name);

  hideLoading(button);

  if (result.success) {
    closeAuthModal();
    // Загружаем локальный прогресс в облако
    if (window.chitasApp && window.chitasApp.achievementsManager) {
      await window.chitasApp.achievementsManager.syncToFirebase();
    }
  } else {
    showError(result.error);
  }
}

// Обработчик входа через Google
async function handleGoogleSignIn(event) {
  event.preventDefault();

  const button = event.target;
  showLoading(button, 'Вход через Google...');

  const result = await window.authManager.signInWithGoogle();

  hideLoading(button);

  if (result.success) {
    closeAuthModal();
    // Загружаем прогресс из облака (тихо, без сообщений для новых пользователей)
    if (window.chitasApp && window.chitasApp.achievementsManager) {
      await window.chitasApp.achievementsManager.loadFromFirebase(true);
    }
  } else {
    if (result.error !== 'Окно входа было закрыто') {
      showError(result.error);
    }
  }
}

// Обработчик сброса пароля
async function handlePasswordReset(event) {
  event.preventDefault();

  const email = document.getElementById('resetEmail').value.trim();

  if (!email) {
    showError('Введите email');
    return;
  }

  const button = event.target;
  showLoading(button, 'Отправка...');

  const result = await window.authManager.resetPassword(email);

  hideLoading(button);

  if (result.success) {
    alert('Ссылка для сброса пароля отправлена на ' + email);
    showSignInForm();
  } else {
    showError(result.error);
  }
}

// Обработчик выхода
async function handleSignOut() {
  if (confirm('Вы уверены, что хотите выйти? Прогресс сохранён в облаке.')) {
    await window.authManager.signOut();
    renderAuthUI();
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Рендерим UI при загрузке
  renderAuthUI();
  
  // Обновляем UI при изменении состояния аутентификации
  if (window.authManager) {
    window.authManager.onAuthStateChanged((user) => {
      renderAuthUI();

      // Загружаем прогресс при входе (тихо, без сообщений)
      if (user && window.chitasApp && window.chitasApp.achievementsManager) {
        window.chitasApp.achievementsManager.loadFromFirebase(true).catch(err => {
          console.log('Could not load progress from Firebase:', err);
        });
      }
    });
  }
  
  // Закрытие модального окна по клику вне его
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target.id === 'authModal') {
      closeAuthModal();
    }
  });
  
  // Обработка Enter в полях ввода
  document.querySelectorAll('.modal input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const form = input.closest('#signInForm, #signUpForm, #resetPasswordForm');
        if (form) {
          const button = form.querySelector('.modal-btn.primary');
          if (button) button.click();
        }
      }
    });
  });
});
