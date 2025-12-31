/* ===============================
   🎪 WHEEL OF FORTUNE GAME
   Колесо удачи для Chitas for Kids
   =============================== */

class WheelGame {
  constructor(container, questions, onComplete) {
    this.container = container;
    this.questions = questions;
    this.onComplete = onComplete;
    this.currentQuestion = null;
    this.answeredQuestions = new Set();
    this.score = 0;
    
    this.init();
  }

  init() {
    this.render();
    this.setupWheel();
  }

  render() {
    this.container.innerHTML = `
      <div class="wheel-game">
        <div class="wheel-header">
          <h3>🎪 Колесо Удачи</h3>
          <div class="wheel-stats">
            <span class="wheel-score">⭐ Баллы: <strong>${this.score}</strong></span>
            <span class="wheel-progress">${this.answeredQuestions.size}/${this.questions.length}</span>
          </div>
        </div>

        <div class="wheel-container">
          <div class="wheel-pointer">▼</div>
          <canvas id="wheelCanvas" width="400" height="400"></canvas>
          <button class="wheel-spin-btn" id="spinBtn">
            🎪 КРУТИТЬ КОЛЕСО
          </button>
        </div>

        <div class="wheel-question-area" id="questionArea" style="display: none;">
          <div class="wheel-question" id="wheelQuestion"></div>
          <div class="wheel-answers" id="wheelAnswers"></div>
          <div class="wheel-feedback" id="wheelFeedback"></div>
        </div>
      </div>
    `;
  }

  setupWheel() {
    this.canvas = document.getElementById('wheelCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.spinBtn = document.getElementById('spinBtn');
    
    // Цвета для сегментов
    this.colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    
    this.currentRotation = 0;
    this.isSpinning = false;
    
    this.drawWheel();
    
    this.spinBtn.onclick = () => this.spin();
  }

  drawWheel() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 180;
    const numSegments = this.questions.length;
    const anglePerSegment = (Math.PI * 2) / numSegments;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем сегменты
    for (let i = 0; i < numSegments; i++) {
      const startAngle = anglePerSegment * i + this.currentRotation;
      const endAngle = startAngle + anglePerSegment;
      
      // Определяем цвет (серый если отвечен)
      const isAnswered = this.answeredQuestions.has(i);
      const color = isAnswered ? '#CCCCCC' : this.colors[i % this.colors.length];
      
      // Рисуем сегмент
      this.ctx.beginPath();
      this.ctx.fillStyle = color;
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.fill();
      
      // Граница сегмента
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      
      // Текст вопроса (номер)
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(startAngle + anglePerSegment / 2);
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillText(i + 1, radius * 0.7, 8);
      this.ctx.restore();
    }
    
    // Центральный круг
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Текст в центре
    this.ctx.fillStyle = '#333333';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPIN', centerX, centerY);
  }

  spin() {
    if (this.isSpinning) return;
    
    // Проверяем что есть неотвеченные вопросы
    if (this.answeredQuestions.size >= this.questions.length) {
      this.showCompletionMessage();
      return;
    }
    
    this.isSpinning = true;
    this.spinBtn.disabled = true;
    this.spinBtn.textContent = '⟲ ВРАЩАЕТСЯ...';
    
    // Скрываем предыдущий вопрос
    document.getElementById('questionArea').style.display = 'none';
    
    // Параметры вращения
    const minSpins = 5; // минимум 5 полных оборотов
    const maxSpins = 8; // максимум 8 полных оборотов
    const spins = minSpins + Math.random() * (maxSpins - minSpins);
    const totalRotation = spins * Math.PI * 2;
    
    const duration = 4000; // 4 секунды
    const startTime = Date.now();
    const startRotation = this.currentRotation;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function для плавного замедления
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      this.currentRotation = startRotation + totalRotation * easeOut;
      this.drawWheel();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.onSpinComplete();
      }
    };
    
    animate();
  }

  onSpinComplete() {
    // Нормализуем угол
    this.currentRotation = this.currentRotation % (Math.PI * 2);
    
    // Определяем выбранный сегмент (указатель сверху)
    const numSegments = this.questions.length;
    const anglePerSegment = (Math.PI * 2) / numSegments;
    
    // Угол указателя (вверху = -π/2)
    const pointerAngle = -Math.PI / 2;
    
    // Вычисляем индекс с учётом поворота
    let selectedIndex = Math.floor(
      ((pointerAngle - this.currentRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / anglePerSegment
    );
    selectedIndex = (numSegments - selectedIndex) % numSegments;
    
    // Если вопрос уже отвечен, крутим снова
    if (this.answeredQuestions.has(selectedIndex)) {
      console.log('Вопрос уже отвечен, крутим снова...');
      this.isSpinning = false;
      this.spinBtn.disabled = false;
      this.spinBtn.textContent = '🎪 КРУТИТЬ ЕЩЁЕ';
      this.spin();
      return;
    }
    
    this.currentQuestion = selectedIndex;
    this.isSpinning = false;
    
    // Небольшая задержка перед показом вопроса
    setTimeout(() => {
      this.showQuestion(selectedIndex);
    }, 500);
  }

  showQuestion(index) {
    const question = this.questions[index];
    const questionArea = document.getElementById('questionArea');
    const questionEl = document.getElementById('wheelQuestion');
    const answersEl = document.getElementById('wheelAnswers');
    const feedbackEl = document.getElementById('wheelFeedback');
    
    questionEl.textContent = `❓ ${question.question}`;
    feedbackEl.innerHTML = '';
    
    answersEl.innerHTML = question.options.map((option, i) => `
      <button class="wheel-answer-btn" data-index="${i}">
        ${option}
      </button>
    `).join('');
    
    questionArea.style.display = 'block';
    
    // Обработчики ответов
    document.querySelectorAll('.wheel-answer-btn').forEach(btn => {
      btn.onclick = (e) => this.checkAnswer(index, parseInt(e.target.dataset.index));
    });
  }

  checkAnswer(questionIndex, answerIndex) {
    const question = this.questions[questionIndex];
    const isCorrect = answerIndex === question.correct;
    
    const feedbackEl = document.getElementById('wheelFeedback');
    const buttons = document.querySelectorAll('.wheel-answer-btn');
    
    // Отключаем все кнопки
    buttons.forEach(btn => btn.disabled = true);
    
    if (isCorrect) {
      buttons[answerIndex].classList.add('correct');
      feedbackEl.innerHTML = `
        <div class="feedback success">
          ✅ ${question.successMessage || 'Правильно! Отличная работа!'}
        </div>
      `;
      
      // Добавляем баллы
      this.score += 10;
      this.answeredQuestions.add(questionIndex);
      
      // Обновляем статистику
      this.updateStats();
      
      // Через 2 секунды разрешаем новое вращение
      setTimeout(() => {
        this.spinBtn.disabled = false;
        this.spinBtn.textContent = this.answeredQuestions.size < this.questions.length 
          ? '🎪 КРУТИТЬ ЕЩЁ' 
          : '🎉 ВСЁ ПРОЙДЕНО!';
        
        document.getElementById('questionArea').style.display = 'none';
        this.drawWheel(); // Перерисовываем с серым сегментом
        
        // Проверяем завершение
        if (this.answeredQuestions.size >= this.questions.length) {
          setTimeout(() => this.showCompletionMessage(), 500);
        }
      }, 2000);
      
    } else {
      buttons[answerIndex].classList.add('wrong');
      buttons[question.correct].classList.add('correct');
      
      feedbackEl.innerHTML = `
        <div class="feedback error">
          ❌ ${question.errorMessage || 'Неправильно. Попробуй ещё раз!'}
        </div>
      `;
      
      // Через 2 секунды разрешаем попытку снова
      setTimeout(() => {
        this.spinBtn.disabled = false;
        this.spinBtn.textContent = '🎪 КРУТИТЬ ЕЩЁ';
        document.getElementById('questionArea').style.display = 'none';
      }, 2500);
    }
  }

  updateStats() {
    const scoreEl = this.container.querySelector('.wheel-score strong');
    const progressEl = this.container.querySelector('.wheel-progress');
    
    if (scoreEl) scoreEl.textContent = this.score;
    if (progressEl) progressEl.textContent = `${this.answeredQuestions.size}/${this.questions.length}`;
  }

  showCompletionMessage() {
    this.container.innerHTML = `
      <div class="wheel-complete">
        <div class="wheel-complete-animation">🎉</div>
        <h2>🎊 ПОЗДРАВЛЯЕМ! 🎊</h2>
        <p>Вы ответили на все вопросы колеса удачи!</p>
        <div class="wheel-final-score">
          <div class="score-big">⭐ ${this.score}</div>
          <div class="score-label">Заработанных баллов</div>
        </div>
        <button class="btn" onclick="location.reload()">
          🔄 Играть ещё раз
        </button>
      </div>
    `;
    
    // Вызываем callback
    if (this.onComplete) {
      this.onComplete(this.score);
    }
  }
}

// Экспорт для использования
window.WheelGame = WheelGame;
