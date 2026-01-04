# Firebase Firestore Security Rules - Полное руководство

**Версия:** rules_version = '2' (последняя)
**Дата:** 2026-01-04
**Язык:** CEL (Common Expression Language)

---

## Оглавление

1. [Основы](#основы)
2. [Структура правил](#структура-правил)
3. [Типы доступа](#типы-доступа)
4. [Переменные и контекст](#переменные-и-контекст)
5. [Функции валидации](#функции-валидации)
6. [Проверка типов данных](#проверка-типов-данных)
7. [Продвинутые техники](#продвинутые-техники)
8. [Примеры для разных сценариев](#примеры-для-разных-сценариев)
9. [Тестирование правил](#тестирование-правил)
10. [Лучшие практики](#лучшие-практики)

---

## Основы

### Минимальный шаблон

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Ваши правила здесь

    // Запретить все по умолчанию
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Философия безопасности

**Принцип:** Запретить всё, разрешить только необходимое.

```javascript
// ❌ ПЛОХО - разрешено всё
match /{document=**} {
  allow read, write: if true;
}

// ✅ ХОРОШО - запрещено по умолчанию
match /{document=**} {
  allow read, write: if false;
}
```

---

## Структура правил

### Базовая структура

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // 1. Вспомогательные функции
    function isAuthenticated() {
      return request.auth != null;
    }

    // 2. Правила для коллекций
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // 3. Вложенные коллекции
    match /posts/{postId} {
      allow read: if true;

      match /comments/{commentId} {
        allow read: if true;
        allow write: if isAuthenticated();
      }
    }
  }
}
```

### Wildcards (подстановочные символы)

```javascript
// Одиночный wildcard - один уровень
match /users/{userId} {
  // Совпадает: /users/123
  // НЕ совпадает: /users/123/posts/456
}

// Рекурсивный wildcard - все уровни
match /posts/{document=**} {
  // Совпадает: /posts/123
  // Совпадает: /posts/123/comments/456
  // Совпадает: /posts/123/comments/456/likes/789
}

// Множественные wildcards
match /users/{userId}/posts/{postId} {
  // Совпадает: /users/123/posts/456
}
```

---

## Типы доступа

### Основные операции

```javascript
match /collection/{docId} {
  // Чтение
  allow get: if <condition>;      // Чтение одного документа
  allow list: if <condition>;     // Чтение множества документов (query)
  allow read: if <condition>;     // get + list

  // Запись
  allow create: if <condition>;   // Создание документа
  allow update: if <condition>;   // Обновление существующего
  allow delete: if <condition>;   // Удаление документа
  allow write: if <condition>;    // create + update + delete
}
```

### Разделение прав

```javascript
match /posts/{postId} {
  // Читать могут все
  allow read: if true;

  // Создавать только аутентифицированные
  allow create: if request.auth != null;

  // Обновлять только автор
  allow update: if request.auth != null &&
                   request.auth.uid == resource.data.authorId;

  // Удалять только автор или админ
  allow delete: if request.auth != null && (
    request.auth.uid == resource.data.authorId ||
    request.auth.token.admin == true
  );
}
```

---

## Переменные и контекст

### request - информация о запросе

```javascript
// request.auth - информация об аутентификации
request.auth.uid              // ID пользователя
request.auth.token.email      // Email пользователя
request.auth.token.admin      // Custom claims
request.auth.token.email_verified  // Email подтвержден

// request.resource - новые данные (create/update)
request.resource.data         // Объект с новыми данными
request.resource.data.title   // Поле title из новых данных

// request.time - время запроса
request.time                  // Timestamp запроса

// request.path - путь к документу
request.path                  // Путь типа /databases/(default)/documents/users/123

// request.method - метод запроса
request.method                // 'get', 'list', 'create', 'update', 'delete'
```

### resource - текущие данные в БД

```javascript
// resource.data - существующие данные (update/delete)
resource.data                 // Объект с текущими данными
resource.data.authorId        // Поле authorId из текущих данных

// resource.id - ID документа
resource.id                   // ID документа

// Примеры использования
match /posts/{postId} {
  // Проверка владельца при обновлении
  allow update: if request.auth.uid == resource.data.authorId;

  // Проверка что автор не изменился
  allow update: if request.resource.data.authorId == resource.data.authorId;
}
```

### Доступ к другим документам

```javascript
match /posts/{postId} {
  allow write: if request.auth != null &&
    // Проверка документа пользователя
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.verified == true;
}

match /comments/{commentId} {
  allow create: if request.auth != null &&
    // Проверка существования поста
    exists(/databases/$(database)/documents/posts/$(request.resource.data.postId));
}
```

**⚠️ Важно:** Максимум 10 вызовов `get()`/`exists()` на запрос!

---

## Функции валидации

### Определение функций

```javascript
// Функции определяются на уровне service
service cloud.firestore {
  match /databases/{database}/documents {

    // Простая функция
    function isAuthenticated() {
      return request.auth != null;
    }

    // Функция с параметрами
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // Функция с множественными проверками
    function isValidEmail(email) {
      return email.matches('.*@.*\\..*');
    }

    // Использование в правилах
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
  }
}
```

### Композиция функций

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isVerified() {
  return request.auth.token.email_verified == true;
}

function isAuthenticatedAndVerified() {
  return isAuthenticated() && isVerified();
}

function isOwnerOrAdmin(userId) {
  return isAuthenticated() && (
    request.auth.uid == userId ||
    request.auth.token.admin == true
  );
}
```

---

## Проверка типов данных

### Типы данных Firestore

```javascript
// Базовые типы
data.field is bool        // Boolean
data.field is int         // Integer
data.field is float       // Float
data.field is number      // Int или Float
data.field is string      // String
data.field is null        // Null
data.field is timestamp   // Timestamp
data.field is duration    // Duration
data.field is path        // Path
data.field is list        // Array
data.field is map         // Object/Map
data.field is latlng      // Geographic point
```

### Валидация структуры данных

```javascript
function isValidUser(data) {
  return (
    // Проверка обязательных полей
    data.keys().hasAll(['name', 'email', 'createdAt']) &&

    // Проверка типов
    data.name is string &&
    data.email is string &&
    data.createdAt is timestamp &&

    // Проверка ограничений
    data.name.size() >= 2 &&
    data.name.size() <= 50 &&
    data.email.matches('.*@.*\\..*') &&

    // Проверка дополнительных полей (макс 10)
    data.size() <= 10 &&

    // Проверка необязательных полей
    (!('age' in data) || (data.age is int && data.age >= 0 && data.age <= 150))
  );
}

match /users/{userId} {
  allow create: if isValidUser(request.resource.data);
  allow update: if isValidUser(request.resource.data);
}
```

### Работа со строками

```javascript
// Размер строки
data.name.size() >= 2
data.name.size() <= 100

// Регулярные выражения
data.email.matches('.*@.*\\..*')
data.phone.matches('\\+?[0-9]{10,15}')

// Проверка содержания
data.status in ['pending', 'active', 'completed']
```

### Работа с числами

```javascript
// Диапазон
data.age >= 0 && data.age <= 150
data.score >= 0 && data.score <= 1000000

// Проверка инкремента
request.resource.data.counter == resource.data.counter + 1

// Проверка не уменьшается
request.resource.data.score >= resource.data.score
```

### Работа с массивами

```javascript
// Размер массива
data.tags.size() <= 10

// Проверка элементов
data.tags.hasAll(['tag1', 'tag2'])
data.tags.hasAny(['tag1', 'tag2', 'tag3'])

// Все элементы определенного типа
data.items.size() == data.items.toSet().size()  // Уникальность
```

### Работа с объектами (map)

```javascript
// Проверка полей
data.settings.keys().hasAll(['theme', 'language'])

// Размер объекта
data.settings.size() <= 20

// Проверка вложенных полей
data.settings.theme in ['light', 'dark']
data.settings.notifications.email is bool
```

### Временные метки

```javascript
// Timestamp должен быть близок к текущему времени
data.createdAt == request.time

// Timestamp в прошлом
data.createdAt < request.time

// Timestamp в будущем (в пределах 1 дня)
data.scheduledAt > request.time &&
data.scheduledAt < request.time + duration.value(1, 'd')

// Проверка что createdAt не изменился
request.resource.data.createdAt == resource.data.createdAt
```

---

## Продвинутые техники

### Инкрементальные обновления

```javascript
match /counters/{counterId} {
  allow update: if (
    // Можно менять только поле count
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['count']) &&

    // Инкремент только на 1
    request.resource.data.count == resource.data.count + 1 &&

    // Не больше 1000
    request.resource.data.count <= 1000
  );
}
```

### Custom Claims (роли)

```javascript
// Установка custom claims (только через Admin SDK)
// admin.auth().setCustomUserClaims(uid, { admin: true, moderator: true });

match /admin/{document} {
  allow read, write: if request.auth.token.admin == true;
}

match /posts/{postId} {
  allow delete: if request.auth != null && (
    request.auth.uid == resource.data.authorId ||
    request.auth.token.moderator == true
  );
}
```

### Batch операции

```javascript
// Правила применяются к КАЖДОМУ документу в batch
// Если хотя бы один не проходит - весь batch отклоняется

match /posts/{postId} {
  allow write: if request.auth != null &&
                  request.auth.uid == request.resource.data.authorId;
}

// При batch создании 100 постов - ВСЕ должны иметь authorId == auth.uid
```

### Защита от race conditions

```javascript
match /likes/{likeId} {
  allow create: if (
    request.auth != null &&
    // Проверка что лайк еще не существует
    !exists(/databases/$(database)/documents/likes/$(likeId))
  );
}
```

### Лимиты на размер документа

```javascript
function isValidSize(data) {
  // Firestore лимит: 1 MB на документ
  // Эмпирически: ~1000 полей среднего размера

  return data.size() <= 100 &&  // Макс 100 полей
         // Проверка каждого поля
         (!('description' in data) || data.description.size() <= 5000);
}
```

---

## Примеры для разных сценариев

### 1. Социальная сеть

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Профили пользователей
    match /users/{userId} {
      allow read: if true;  // Публичные профили
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;  // Нельзя удалять
    }

    // Посты
    match /posts/{postId} {
      allow read: if true;  // Публичные посты
      allow create: if isAuthenticated() &&
                       request.resource.data.authorId == request.auth.uid;
      allow update: if isAuthenticated() &&
                       resource.data.authorId == request.auth.uid;
      allow delete: if isAuthenticated() &&
                       resource.data.authorId == request.auth.uid;

      // Комментарии
      match /comments/{commentId} {
        allow read: if true;
        allow create: if isAuthenticated();
        allow delete: if isAuthenticated() && (
          request.auth.uid == resource.data.authorId ||
          request.auth.uid == get(/databases/$(database)/documents/posts/$(postId)).data.authorId
        );
      }
    }

    // Приватные сообщения
    match /chats/{chatId} {
      allow read, write: if isAuthenticated() &&
        request.auth.uid in resource.data.participants;
    }
  }
}
```

### 2. E-commerce

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Продукты (публичные)
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }

    // Корзины (приватные)
    match /carts/{userId} {
      allow read, write: if request.auth != null &&
                            request.auth.uid == userId;
    }

    // Заказы
    match /orders/{orderId} {
      // Читать только свои заказы
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        request.auth.token.admin == true
      );

      // Создавать только свои заказы
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.status == 'pending';

      // Обновлять статус могут только админы
      allow update: if request.auth.token.admin == true;
    }
  }
}
```

### 3. Блог с черновиками

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /articles/{articleId} {
      // Читать могут все опубликованные
      allow read: if resource.data.published == true;

      // Автор может читать свои черновики
      allow get: if request.auth != null &&
                    request.auth.uid == resource.data.authorId;

      // Создавать только свои статьи
      allow create: if request.auth != null &&
                       request.resource.data.authorId == request.auth.uid;

      // Обновлять только свои
      allow update: if request.auth != null &&
                       request.auth.uid == resource.data.authorId &&
                       // authorId не должен меняться
                       request.resource.data.authorId == resource.data.authorId;
    }
  }
}
```

### 4. Реалтайм игра с очками

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isValidScore(newScore, oldScore) {
      return (
        // Очки только увеличиваются
        newScore >= oldScore &&
        // Максимальный прирост за раз: 1000
        newScore - oldScore <= 1000 &&
        // Максимум 10 миллионов
        newScore <= 10000000
      );
    }

    match /players/{userId} {
      allow read: if true;

      allow create: if request.auth != null &&
                       request.auth.uid == userId &&
                       request.resource.data.score == 0;

      allow update: if request.auth != null &&
                       request.auth.uid == userId &&
                       isValidScore(
                         request.resource.data.score,
                         resource.data.score
                       );
    }
  }
}
```

---

## Тестирование правил

### Rules Playground (Firebase Console)

1. Откройте Firebase Console
2. Firestore Database → Rules
3. Нажмите "Rules Playground"
4. Выберите тип операции (get, list, create, update, delete)
5. Укажите путь к документу
6. Настройте аутентификацию (authenticated/unauthenticated)
7. Добавьте данные
8. Запустите симуляцию

### Локальное тестирование с эмулятором

```bash
# Установка
npm install -g firebase-tools

# Инициализация
firebase init emulators

# Запуск эмулятора
firebase emulators:start --only firestore

# Эмулятор доступен на http://localhost:8080
```

### Unit тесты

```javascript
// npm install @firebase/rules-unit-testing

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-project',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080
    }
  });
});

test('Пользователь может читать только свои данные', async () => {
  const alice = testEnv.authenticatedContext('alice');
  const bob = testEnv.authenticatedContext('bob');

  // Alice может читать свои данные
  await assertSucceeds(
    alice.firestore().collection('users').doc('alice').get()
  );

  // Bob НЕ может читать данные Alice
  await assertFails(
    bob.firestore().collection('users').doc('alice').get()
  );
});

afterAll(async () => {
  await testEnv.cleanup();
});
```

---

## Лучшие практики

### 1. Безопасность по умолчанию

```javascript
// ✅ ХОРОШО - запрещено по умолчанию
match /{document=**} {
  allow read, write: if false;
}

// ❌ ПЛОХО - разрешено всё
match /{document=**} {
  allow read, write: if true;
}
```

### 2. Принцип наименьших привилегий

```javascript
// ✅ ХОРОШО - разделение прав
match /posts/{postId} {
  allow read: if true;                    // Все могут читать
  allow create: if isAuthenticated();     // Только авторизованные создают
  allow update: if isOwner(userId);       // Только владелец редактирует
  allow delete: if isAdmin();             // Только админ удаляет
}

// ❌ ПЛОХО - одинаковые права на всё
match /posts/{postId} {
  allow read, write: if isAuthenticated();
}
```

### 3. Валидация данных

```javascript
// ✅ ХОРОШО - валидация всех полей
function isValidPost(data) {
  return data.keys().hasAll(['title', 'content', 'authorId']) &&
         data.title is string &&
         data.title.size() >= 1 &&
         data.title.size() <= 200 &&
         data.content is string &&
         data.content.size() <= 10000 &&
         data.size() <= 10;
}

// ❌ ПЛОХО - нет валидации
allow create: if isAuthenticated();
```

### 4. Оптимизация get()/exists()

```javascript
// ❌ ПЛОХО - много запросов
allow write: if get(...).data.x && get(...).data.y && get(...).data.z;

// ✅ ХОРОШО - один запрос, переиспользование
allow write: if (
  let userData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
  userData.verified && userData.active
);
```

### 5. Использование функций

```javascript
// ✅ ХОРОШО - переиспользуемые функции
function isOwner(userId) {
  return request.auth != null && request.auth.uid == userId;
}

function isValidEmail(email) {
  return email.matches('.*@.*\\..*');
}

// ❌ ПЛОХО - дублирование кода
match /users/{userId} {
  allow update: if request.auth != null && request.auth.uid == userId;
}

match /profiles/{userId} {
  allow update: if request.auth != null && request.auth.uid == userId;
}
```

### 6. Защита от манипуляций

```javascript
// ✅ ХОРОШО - проверка неизменяемых полей
allow update: if (
  // authorId не должен меняться
  request.resource.data.authorId == resource.data.authorId &&
  // createdAt не должен меняться
  request.resource.data.createdAt == resource.data.createdAt
);

// ❌ ПЛОХО - можно подменить authorId
allow update: if request.auth.uid == request.resource.data.authorId;
```

### 7. Лимиты и ограничения

```javascript
// ✅ ХОРОШО - защита от переполнения
function isReasonableUpdate() {
  return (
    request.resource.data.score - resource.data.score <= 1000 &&
    request.resource.data.score <= 10000000
  );
}
```

### 8. Документация

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ========================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ========================================

    // Проверка аутентификации
    function isAuth() {
      return request.auth != null;
    }

    // ========================================
    // КОЛЛЕКЦИЯ ПОЛЬЗОВАТЕЛЕЙ
    // Правила: публичное чтение, приватная запись
    // ========================================

    match /users/{userId} {
      allow read: if true;
      allow write: if isAuth() && request.auth.uid == userId;
    }
  }
}
```

---

## Чек-лист перед деплоем

- [ ] Все правила протестированы в Rules Playground
- [ ] Есть запрет по умолчанию: `match /{document=**} { allow read, write: if false; }`
- [ ] Все поля валидируются (типы, размеры, диапазоны)
- [ ] Неизменяемые поля (createdAt, authorId) защищены от изменения
- [ ] Нет избыточных вызовов get()/exists() (макс 10)
- [ ] Custom claims используются для ролей
- [ ] Временные метки проверяются относительно request.time
- [ ] Защита от читерства (лимиты на инкременты)
- [ ] Написаны unit тесты для критичных правил
- [ ] Правила задокументированы

---

## Деплой правил

### Через Firebase CLI

```bash
# Проверка синтаксиса
firebase deploy --only firestore:rules --dry-run

# Деплой
firebase deploy --only firestore:rules

# Откат к предыдущей версии (через Console)
```

### Через Firebase Console

1. Firestore Database → Rules
2. Отредактируйте правила
3. Нажмите "Publish"

---

## Полезные ссылки

- [Официальная документация](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Reference документация](https://firebase.google.com/docs/reference/rules)
- [Примеры правил](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Rules Playground](https://console.firebase.google.com/)

---

## Заключение

Firebase Firestore Security Rules - это мощный инструмент для защиты данных. Правильно настроенные правила:

- ✅ Защищают от несанкционированного доступа
- ✅ Валидируют структуру и содержимое данных
- ✅ Предотвращают читерство и манипуляции
- ✅ Работают на стороне сервера (нельзя обойти)

**Помните:** Правила - это единственная защита данных в Firestore. Клиентский код можно обойти, правила - нет!
