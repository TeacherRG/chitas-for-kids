/**
 * TRUE/FALSE GAME ENGINE
 * Игра "Правда или Ложь"
 */

class TrueFalseGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
        this.answeredCount = 0;
        this.totalQuestions = gameData.questions.length;
    }

    render() {
        let html = `<div class="truefalse-game active"><div class="truefalse-questions">`;
        
        this.data.questions.forEach((q, i) => {
            html += `
                <div class="truefalse-item" data-question-index="${i}">
                    <div class="truefalse-statement">${i + 1}. ${this.escapeHtml(q.statement)}</div>
                    <div class="truefalse-buttons">
                        <button class="truefalse-button" data-answer="true">✓ Правда</button>
                        <button class="truefalse-button" data-answer="false">✗ Ложь</button>
                    </div>
                    <div class="truefalse-explanation">${this.escapeHtml(q.explanation)}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        this.container.innerHTML = html;
        this.attachHandlers();
    }

    attachHandlers() {
        this.container.querySelectorAll('.truefalse-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('disabled')) return;
                
                const answer = e.target.dataset.answer === 'true';
                const item = e.target.closest('.truefalse-item');
                const questionIndex = parseInt(item.dataset.questionIndex);
                
                this.handleAnswer(questionIndex, answer, item, e.target);
            });
        });
    }

    handleAnswer(questionIndex, answer, itemEl, buttonEl) {
        const question = this.data.questions[questionIndex];
        const isCorrect = answer === question.correct;

        // Disable buttons for this question
        itemEl.querySelectorAll('.truefalse-button').forEach(btn => {
            btn.classList.add('disabled');
        });

        if (isCorrect) {
            buttonEl.classList.add('correct');
        } else {
            buttonEl.classList.add('incorrect');
            const correctBtn = itemEl.querySelector(`[data-answer="${question.correct}"]`);
            if (correctBtn) correctBtn.classList.add('correct');
        }

        // Show explanation
        const explanation = itemEl.querySelector('.truefalse-explanation');
        if (explanation) explanation.classList.add('show');

        // Check if all answered
        this.answeredCount++;
        if (this.answeredCount === this.totalQuestions && this.onComplete) {
            this.onComplete(true);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrueFalseGame;
}
