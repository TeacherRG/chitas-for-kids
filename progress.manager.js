/**
 * Progress Manager
 * Управление прогрессом пользователя (локально и в облаке)
 */

class ProgressManager {
  constructor() {
    this.localStorageKey = 'chitasProgress';
  }

  /**
   * Сохранить прогресс (локально + облако если авторизован)
   */
  async saveProgress(progressData) {
    // Всегда сохраняем локально
    this.saveLocal(progressData);

    // Если авторизован - сохраняем в облако
    if (window.authManager && window.authManager.isSignedIn()) {
      await this.saveToCloud(progressData);
    }
  }

  /**
   * Загрузить прогресс
   */
  async loadProgress() {
    // Если авторизован - загружаем из облака
    if (window.authManager && window.authManager.isSignedIn()) {
      const cloudProgress = await this.loadFromCloud();
      if (cloudProgress) {
        return cloudProgress;
      }
    }

    // Иначе загружаем локально
    return this.loadLocal();
  }

  /**
   * Сохранить локально в localStorage
   */
  saveLocal(progressData) {
    try {
      const dataToSave = {
        ...progressData,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToSave));
      console.log('✅ Progress saved locally');
    } catch (error) {
      console.error('Error saving locally:', error);
    }
  }

  /**
   * Загрузить локально из localStorage
   */
  loadLocal() {
    try {
      const saved = localStorage.getItem(this.localStorageKey);
      if (saved) {
        const progress = JSON.parse(saved);
        console.log('📂 Progress loaded from local storage');
        return progress;
      }
    } catch (error) {
      console.error('Error loading locally:', error);
    }
    return null;
  }

  /**
   * Сохранить в облако (Firestore)
   */
  async saveToCloud(progressData) {
    try {
      const userId = window.authManager.getUserId();
      if (!userId) return;

      const dataToSave = {
        ...progressData,
        lastSaved: firebase.firestore.FieldValue.serverTimestamp(),
        userId: userId
      };

      await db.collection('userProgress').doc(userId).set(dataToSave, { merge: true });
      console.log('☁️ Progress saved to cloud');
    } catch (error) {
      console.error('Error saving to cloud:', error);
    }
  }

  /**
   * Загрузить из облака (Firestore)
   */
  async loadFromCloud() {
    try {
      const userId = window.authManager.getUserId();
      if (!userId) return null;

      const doc = await db.collection('userProgress').doc(userId).get();
      
      if (doc.exists) {
        console.log('☁️ Progress loaded from cloud');
        return doc.data();
      }
    } catch (error) {
      console.error('Error loading from cloud:', error);
    }
    return null;
  }

  /**
   * Синхронизировать локальный прогресс с облаком
   */
  async syncProgress() {
    if (!window.authManager || !window.authManager.isSignedIn()) {
      return;
    }

    const localProgress = this.loadLocal();
    const cloudProgress = await this.loadFromCloud();

    // Если нет облачного прогресса - загружаем локальный
    if (!cloudProgress && localProgress) {
      console.log('📤 Uploading local progress to cloud...');
      await this.saveToCloud(localProgress);
      return localProgress;
    }

    // Если есть оба - берём более свежий
    if (localProgress && cloudProgress) {
      const localDate = new Date(localProgress.lastSaved);
      const cloudDate = cloudProgress.lastSaved?.toDate ? 
        cloudProgress.lastSaved.toDate() : 
        new Date(cloudProgress.lastSaved);

      if (localDate > cloudDate) {
        console.log('📤 Local is newer, uploading to cloud...');
        await this.saveToCloud(localProgress);
        return localProgress;
      } else {
        console.log('📥 Cloud is newer, using cloud progress...');
        this.saveLocal(cloudProgress);
        return cloudProgress;
      }
    }

    // Иначе возвращаем то, что есть
    return cloudProgress || localProgress;
  }

  /**
   * Очистить весь прогресс (локально и облако)
   */
  async clearProgress() {
    // Очистка локально
    localStorage.removeItem(this.localStorageKey);
    console.log('🗑️ Local progress cleared');

    // Очистка в облаке
    if (window.authManager && window.authManager.isSignedIn()) {
      try {
        const userId = window.authManager.getUserId();
        await db.collection('userProgress').doc(userId).delete();
        console.log('☁️ Cloud progress cleared');
      } catch (error) {
        console.error('Error clearing cloud:', error);
      }
    }
  }

  /**
   * Получить статистику пользователя
   */
  async getUserStats() {
    const progress = await this.loadProgress();
    if (!progress) {
      return {
        totalScore: 0,
        totalStars: 0,
        daysCompleted: 0,
        sectionsCompleted: 0
      };
    }

    return {
      totalScore: progress.score || 0,
      totalStars: progress.stars || 0,
      daysCompleted: Object.keys(progress.completedDays || {}).length,
      sectionsCompleted: Object.keys(progress.completed || {}).length
    };
  }
}

// Глобальный экземпляр
window.progressManager = new ProgressManager();
