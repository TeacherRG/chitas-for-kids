/**
 * WHEEL OF FORTUNE GAME ENGINE - УЛУЧШЕННАЯ ВЕРСИЯ
 * Колесо фортуны с системой баллов и интерактивными вопросами
 */

class WheelGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
        this.currentRotation = 0;
        this.isSpinning = false;
        this.totalScore = 0;
        this.currentRound = 0;
        this.answeredQuestions = new Set();
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.currentMultiplier = 1;

        // Инициализация сегментов колеса
        this.initializeSegments();
    }

    initializeSegments() {
        const questions = this.data.questions || [];
        this.segments = [];

        // Добавляем вопросы с баллами
        questions.forEach((question, index) => {
            const points = this.calculatePoints(index, questions.length);
            this.segments.push({
                type: 'question',
                question: question,
                points: points,
                index: index
            });
        });

        // Добавляем специальные сегменты (если вопросов достаточно)
        if (questions.length >= 6) {
            this.insertSpecialSegments();
        }
    }

    calculatePoints(index, total) {
        // Различные значения баллов для разнообразия (уменьшено в 10 раз для баланса)
        const pointValues = [10, 20, 30, 40, 50, 15, 25, 35, 45, 60];
        return pointValues[index % pointValues.length];
    }

    insertSpecialSegments() {
        // Вставляем специальные сегменты между обычными
        const specialSegments = [
            { type: 'bankrupt', points: 0, label: '💥 БАНКРОТ', color: '#2C3E50' },
            { type: 'double', points: 0, label: '✖️2 УДВОЕНИЕ', color: '#27AE60' },
            { type: 'bonus', points: 50, label: '🎁 БОНУС 50', color: '#F39C12' }
        ];

        // Вставляем специальные сегменты в случайные позиции
        const positions = this.getRandomPositions(3, this.segments.length);
        positions.sort((a, b) => b - a); // Сортируем в обратном порядке

        positions.forEach((pos, idx) => {
            this.segments.splice(pos, 0, specialSegments[idx]);
        });
    }

    getRandomPositions(count, max) {
        const positions = [];
        while (positions.length < count) {
            const pos = Math.floor(Math.random() * max);
            if (!positions.includes(pos)) {
                positions.push(pos);
            }
        }
        return positions;
    }

    render() {
        const html = `
            <div class="wheel-game active">
                <div class="wheel-header">
                    <h3 class="wheel-title">${this.escapeHtml(this.data.title || 'Колесо Фортуны 🎯')}</h3>
                    <div class="wheel-score-display">
                        <div class="score-item">
                            <span class="score-label">Очки:</span>
                            <span class="score-value" id="wheelTotalScore">0</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Раунд:</span>
                            <span class="score-value" id="wheelRound">1</span>
                        </div>
                    </div>
                </div>

                <div class="wheel-stats">
                    <span class="stat-item correct">✓ <span id="wheelCorrect">0</span></span>
                    <span class="stat-item wrong">✗ <span id="wheelWrong">0</span></span>
                    <span class="stat-item multiplier" id="wheelMultiplier" style="display:none;">
                        ✖️ <span id="wheelMultiplierValue">1</span>
                    </span>
                </div>

                <div class="wheel-container">
                    <canvas id="wheelCanvas" width="500" height="500"></canvas>
                    <div class="wheel-pointer">▼</div>
                    <div class="wheel-center-button">
                        <button class="btn wheel-spin" id="wheelSpinBtn">
                            <span class="spin-icon">🎯</span>
                            <span class="spin-text">КРУТИТЬ!</span>
                        </button>
                    </div>
                </div>

                <div class="wheel-question-container" id="wheelQuestionContainer" style="display:none;">
                    <div class="wheel-segment-info" id="wheelSegmentInfo"></div>
                    <div class="wheel-question-content" id="wheelQuestionContent"></div>
                </div>

                <div class="wheel-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="wheelProgressFill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="wheelProgressText">0 из ${this.data.questions?.length || 0} вопросов</div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.drawWheel();
        this.attachHandlers();
        this.updateScoreDisplay();
    }

    drawWheel() {
        const canvas = document.getElementById('wheelCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 220;

        const segmentAngle = (2 * Math.PI) / this.segments.length;

        this.segments.forEach((segment, i) => {
            const startAngle = i * segmentAngle + this.currentRotation;
            const endAngle = startAngle + segmentAngle;

            // Определяем цвет сегмента
            let color;
            if (segment.type === 'question') {
                const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9', '#A29BFE', '#FD79A8'];
                color = colors[segment.index % colors.length];
            } else {
                color = segment.color;
            }

            // Рисуем сегмент
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Добавляем тень для глубины
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Рисуем текст
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.font = 'bold 18px Arial';

            if (segment.type === 'question') {
                const text = `${segment.points}`;
                ctx.strokeText(text, radius - 30, 7);
                ctx.fillText(text, radius - 30, 7);

                // Маленькая иконка вопроса
                ctx.font = 'bold 14px Arial';
                const questionIcon = '❓';
                ctx.strokeText(questionIcon, radius - 70, 7);
                ctx.fillText(questionIcon, radius - 70, 7);
            } else {
                // Для специальных сегментов
                ctx.font = 'bold 16px Arial';
                const lines = segment.label.split(' ');
                lines.forEach((line, idx) => {
                    const y = -8 + (idx * 20);
                    ctx.strokeText(line, radius - 30, y);
                    ctx.fillText(line, radius - 30, y);
                });
            }

            ctx.restore();
        });

        // Рисуем центральный круг
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.fillStyle = '#2C3E50';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Сбрасываем тень
        ctx.shadowColor = 'transparent';
    }

    attachHandlers() {
        const spinBtn = document.getElementById('wheelSpinBtn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spin());
        }
    }

    spin() {
        if (this.isSpinning) return;

        // Проверяем, не закончились ли вопросы
        if (this.answeredQuestions.size >= this.data.questions.length) {
            this.showGameComplete();
            return;
        }

        this.isSpinning = true;
        this.currentRound++;
        this.updateRoundDisplay();

        // Скрываем предыдущий вопрос
        const questionContainer = document.getElementById('wheelQuestionContainer');
        if (questionContainer) {
            questionContainer.style.display = 'none';
        }

        // Анимация кнопки
        const spinBtn = document.getElementById('wheelSpinBtn');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.classList.add('spinning');
        }

        const spins = 5 + Math.random() * 3; // 5-8 оборотов
        const finalRotation = this.currentRotation + (spins * 2 * Math.PI);
        const duration = 4000; // 4 секунды
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeOutCubic(progress);

            this.currentRotation = this.currentRotation + (finalRotation - this.currentRotation) * eased;
            this.drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                if (spinBtn) {
                    spinBtn.classList.remove('spinning');
                    spinBtn.disabled = false;
                }
                this.showSelectedSegment();
            }
        };

        animate();
    }

    showSelectedSegment() {
        const segmentAngle = (2 * Math.PI) / this.segments.length;
        const normalizedRotation = (2 * Math.PI - (this.currentRotation % (2 * Math.PI))) % (2 * Math.PI);
        const selectedIndex = Math.floor(normalizedRotation / segmentAngle) % this.segments.length;

        const segment = this.segments[selectedIndex];

        if (segment.type === 'question') {
            this.showQuestion(segment);
        } else {
            this.handleSpecialSegment(segment);
        }
    }

    showQuestion(segment) {
        // Проверяем, не был ли уже отвечен этот вопрос
        if (this.answeredQuestions.has(segment.index)) {
            this.showMessage('Этот вопрос уже был отвечен! Крутите еще раз.', 'info');
            return;
        }

        const question = segment.question;
        const questionContainer = document.getElementById('wheelQuestionContainer');
        const segmentInfo = document.getElementById('wheelSegmentInfo');
        const questionContent = document.getElementById('wheelQuestionContent');

        if (!questionContainer || !segmentInfo || !questionContent) return;

        // Показываем информацию о сегменте
        let pointsText = `${segment.points} очков`;
        if (this.currentMultiplier > 1) {
            pointsText += ` ✖️ ${this.currentMultiplier} = ${segment.points * this.currentMultiplier} очков`;
        }

        segmentInfo.innerHTML = `
            <div class="segment-info-card">
                <span class="segment-icon">🎯</span>
                <span class="segment-points">${pointsText}</span>
            </div>
        `;

        // Показываем вопрос
        questionContent.innerHTML = `
            <div class="wheel-question-box">
        <h4 class="question-title">
          ${this.escapeHtml(question.text || question.question)}
        </h4> 
        <div class="wheel-options" id="wheelOptions">
                    ${question.options.map((option, i) => `
                        <button class="wheel-option" data-index="${i}">
                            ${this.escapeHtml(option)}
                        </button>
                    `).join('')}
                </div>
                <div class="wheel-feedback" id="wheelFeedback" style="display:none;"></div>
            </div>
        `;

        questionContainer.style.display = 'block';

        // Прокручиваем к вопросу
        questionContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Добавляем обработчики для вариантов ответа
        const options = questionContent.querySelectorAll('.wheel-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.target.dataset.index);
                this.handleAnswer(segment, selectedIndex);
            });
        });
    }

    handleAnswer(segment, selectedIndex) {
        const question = segment.question;
        const isCorrect = selectedIndex === question.correctIndex;

        // Отмечаем вопрос как отвеченный
        this.answeredQuestions.add(segment.index);

        // Отключаем все кнопки
        const options = document.querySelectorAll('.wheel-option');
        options.forEach(opt => opt.disabled = true);

        // Подсвечиваем правильный и выбранный ответы
        options[question.correctIndex].classList.add('correct');
        if (!isCorrect) {
            options[selectedIndex].classList.add('wrong');
        }

        // Показываем feedback
        const feedback = document.getElementById('wheelFeedback');
        if (feedback) {
            const points = segment.points * this.currentMultiplier;

            if (isCorrect) {
                this.correctAnswers++;
                this.totalScore += points;
                feedback.className = 'wheel-feedback success';
                feedback.innerHTML = `
                    <div class="feedback-icon">🎉</div>
                    <div class="feedback-title">Правильно!</div>
                    <div class="feedback-points">+${points} очков</div>
                    <div class="feedback-text">${this.escapeHtml(question.explanation || '')}</div>
                `;

                // Анимация добавления очков
                this.animateScoreIncrease(points);
            } else {
                this.wrongAnswers++;
                feedback.className = 'wheel-feedback error';
                feedback.innerHTML = `
                    <div class="feedback-icon">😔</div>
                    <div class="feedback-title">Неправильно</div>
                    <div class="feedback-text">${this.escapeHtml(question.explanation || '')}</div>
                `;
            }

            feedback.style.display = 'block';
        }

        // Сбрасываем множитель после использования
        if (this.currentMultiplier > 1) {
            this.currentMultiplier = 1;
            this.updateMultiplierDisplay();
        }

        // Обновляем статистику
        this.updateStats();
        this.updateProgress();

        // Проверяем, закончилась ли игра
        if (this.answeredQuestions.size >= this.data.questions.length) {
            setTimeout(() => {
                this.showGameComplete();
            }, 2000);
        }
    }

    handleSpecialSegment(segment) {
        const questionContainer = document.getElementById('wheelQuestionContainer');
        const segmentInfo = document.getElementById('wheelSegmentInfo');
        const questionContent = document.getElementById('wheelQuestionContent');

        if (!questionContainer || !segmentInfo || !questionContent) return;

        questionContainer.style.display = 'block';
        questionContent.innerHTML = '';

        switch (segment.type) {
            case 'bankrupt':
                segmentInfo.innerHTML = `
                    <div class="segment-info-card bankrupt">
                        <span class="segment-icon">💥</span>
                        <span class="segment-title">БАНКРОТ!</span>
                        <span class="segment-text">Все очки обнулены!</span>
                    </div>
                `;
                this.totalScore = 0;
                this.updateScoreDisplay();
                this.showMessage('💥 Банкрот! Все очки потеряны!', 'error');
                break;

            case 'double':
                segmentInfo.innerHTML = `
                    <div class="segment-info-card double">
                        <span class="segment-icon">✖️2</span>
                        <span class="segment-title">УДВОЕНИЕ!</span>
                        <span class="segment-text">Следующий правильный ответ принесет двойные очки!</span>
                    </div>
                `;
                this.currentMultiplier = 2;
                this.updateMultiplierDisplay();
                this.showMessage('✖️2 Удвоение! Следующий ответ принесет двойные очки!', 'success');
                break;

            case 'bonus':
                segmentInfo.innerHTML = `
                    <div class="segment-info-card bonus">
                        <span class="segment-icon">🎁</span>
                        <span class="segment-title">БОНУС!</span>
                        <span class="segment-text">+50 очков!</span>
                    </div>
                `;
                this.totalScore += 50;
                this.animateScoreIncrease(50);
                this.showMessage('🎁 Бонус! +50 очков!', 'success');
                break;
        }

        questionContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showMessage(text, type) {
        // Создаем временное сообщение
        const message = document.createElement('div');
        message.className = `wheel-message ${type}`;
        message.textContent = text;
        this.container.appendChild(message);

        setTimeout(() => {
            message.classList.add('show');
        }, 10);

        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    showGameComplete() {
        const questionContainer = document.getElementById('wheelQuestionContainer');
        const segmentInfo = document.getElementById('wheelSegmentInfo');
        const questionContent = document.getElementById('wheelQuestionContent');

        if (!questionContainer || !segmentInfo || !questionContent) return;

        const accuracy = this.data.questions.length > 0
            ? Math.round((this.correctAnswers / this.data.questions.length) * 100)
            : 0;

        let resultEmoji = '🏆';
        let resultTitle = 'Отлично!';
        if (accuracy < 50) {
            resultEmoji = '📚';
            resultTitle = 'Продолжайте учиться!';
        } else if (accuracy < 80) {
            resultEmoji = '👍';
            resultTitle = 'Хорошо!';
        }

        segmentInfo.innerHTML = '';
        questionContent.innerHTML = `
            <div class="wheel-complete">
                <div class="complete-icon">${resultEmoji}</div>
                <h3 class="complete-title">${resultTitle}</h3>
                <div class="complete-stats">
                    <div class="stat-box">
                        <div class="stat-value">${this.totalScore}</div>
                        <div class="stat-label">Всего очков</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${accuracy}%</div>
                        <div class="stat-label">Точность</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${this.correctAnswers}/${this.data.questions.length}</div>
                        <div class="stat-label">Правильно</div>
                    </div>
                </div>
            </div>
        `;

        questionContainer.style.display = 'block';
        questionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Отключаем кнопку вращения
        const spinBtn = document.getElementById('wheelSpinBtn');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerHTML = '<span class="spin-text">Игра завершена!</span>';
        }

        if (this.onComplete) {
            this.onComplete(this.correctAnswers > this.wrongAnswers);
        }
    }

    animateScoreIncrease(points) {
        const scoreElement = document.getElementById('wheelTotalScore');
        if (!scoreElement) return;

        const startScore = this.totalScore - points;
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentScore = Math.floor(startScore + (points * progress));

            scoreElement.textContent = currentScore;
            scoreElement.classList.add('score-pulse');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => {
                    scoreElement.classList.remove('score-pulse');
                }, 500);
            }
        };

        animate();
    }

    updateScoreDisplay() {
        const scoreElement = document.getElementById('wheelTotalScore');
        if (scoreElement) {
            scoreElement.textContent = this.totalScore;
        }
    }

    updateRoundDisplay() {
        const roundElement = document.getElementById('wheelRound');
        if (roundElement) {
            roundElement.textContent = this.currentRound;
        }
    }

    updateStats() {
        const correctElement = document.getElementById('wheelCorrect');
        const wrongElement = document.getElementById('wheelWrong');

        if (correctElement) correctElement.textContent = this.correctAnswers;
        if (wrongElement) wrongElement.textContent = this.wrongAnswers;
    }

    updateMultiplierDisplay() {
        const multiplierElement = document.getElementById('wheelMultiplier');
        const multiplierValue = document.getElementById('wheelMultiplierValue');

        if (multiplierElement && multiplierValue) {
            if (this.currentMultiplier > 1) {
                multiplierElement.style.display = 'inline-block';
                multiplierValue.textContent = this.currentMultiplier;
            } else {
                multiplierElement.style.display = 'none';
            }
        }
    }

    updateProgress() {
        const progressFill = document.getElementById('wheelProgressFill');
        const progressText = document.getElementById('wheelProgressText');

        if (progressFill && progressText) {
            const total = this.data.questions?.length || 0;
            const answered = this.answeredQuestions.size;
            const percentage = total > 0 ? (answered / total) * 100 : 0;

            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${answered} из ${total} вопросов`;
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WheelGame;
}
