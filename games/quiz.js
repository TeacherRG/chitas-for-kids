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
            this.showFeedback(true, this.data.explanation);
            if (this.onComplete) this.onComplete(true);
        } else {
            options[optionIndex].classList.add('incorrect');
            options[this.data.correctIndex].classList.add('correct');
            this.showFeedback(false, this.data.explanation);
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
