/**
 * QUIZ GAME ENGINE
 * Викторина с выбором ответа
 */

class QuizGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
        this.answered = false;
    }

    render() {
        let html = `
            <div class="quiz-game active">
                <h3 class="quiz-question">${this.escapeHtml(this.data.question)}</h3>
                <div class="quiz-options">
        `;
        
        this.data.options.forEach((option, i) => {
            html += `<div class="quiz-option" data-option-index="${i}">${this.escapeHtml(option)}</div>`;
        });
        
        html += `
                </div>
                <div class="quiz-feedback">
                    <div class="feedback-title"></div>
                    <div class="feedback-text"></div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachHandlers();
    }

    attachHandlers() {
        this.container.querySelectorAll('.quiz-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                if (this.answered) return;
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                this.handleAnswer(optionIndex);
            });
        });
    }

    handleAnswer(optionIndex) {
        this.answered = true;
        const isCorrect = optionIndex === this.data.correctIndex;

        // Disable all options
        this.container.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.add('disabled');
        });

        const options = this.container.querySelectorAll('.quiz-option');

        if (isCorrect) {
            options[optionIndex].classList.add('correct');

            // Конфетти при правильном ответе! 🎉
            if (typeof confetti !== 'undefined') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#4CAF50', '#667eea', '#FF6B9D']
                });
            }

            this.showFeedback(true, this.data.explanation);
            // Показываем финальное поздравление через 1.5 секунды
            setTimeout(() => {
                this.showCompletionMessage(true);
            }, 1500);
            if (this.onComplete) this.onComplete(true);
        } else {
            options[optionIndex].classList.add('incorrect');
            options[this.data.correctIndex].classList.add('correct');
            this.showFeedback(false, this.data.explanation);
            // Показываем сообщение поддержки через 1.5 секунды
            setTimeout(() => {
                this.showCompletionMessage(false);
            }, 1500);
            if (this.onComplete) this.onComplete(false);
        }
    }

    showFeedback(success, text) {
        const feedback = this.container.querySelector('.quiz-feedback');
        if (!feedback) return;

        feedback.className = success ? 'quiz-feedback success show' : 'quiz-feedback error show';
        const title = feedback.querySelector('.feedback-title');
        const textEl = feedback.querySelector('.feedback-text');

        if (title) title.textContent = success ? '🎉 Отлично!' : '😔 Неправильно';
        if (textEl) textEl.textContent = text;
    }

    showCompletionMessage(success) {
        // Создаем модальное окно с финальным сообщением
        const modal = document.createElement('div');
        modal.className = 'quiz-completion-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;

        const overlay = document.createElement('div');
        overlay.className = 'quiz-completion-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;

        if (success) {
            modal.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #4CAF50; margin-bottom: 15px;">Поздравляем!</h2>
                <p style="font-size: 18px; color: #555; margin-bottom: 20px;">
                    Вы отлично справились с викториной!
                </p>
                <button class="quiz-completion-btn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    font-weight: bold;
                ">Отлично!</button>
            `;
        } else {
            modal.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">💪</div>
                <h2 style="color: #FF9800; margin-bottom: 15px;">Не расстраивайтесь!</h2>
                <p style="font-size: 18px; color: #555; margin-bottom: 20px;">
                    В следующий раз обязательно получится лучше!
                </p>
                <button class="quiz-completion-btn" style="
                    background: #FF9800;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    font-weight: bold;
                ">Попробую еще!</button>
            `;
        }

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Добавляем анимацию
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -60%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }
        `;
        document.head.appendChild(style);

        // Закрытие по клику на кнопку или overlay
        const closeModal = () => {
            modal.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                modal.remove();
                overlay.remove();
                style.remove();
            }, 300);
        };

        modal.querySelector('.quiz-completion-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizGame;
}
