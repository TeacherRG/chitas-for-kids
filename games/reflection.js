 /**
 * REFLECTION GAME ENGINE
 * Игра размышления с текстовым вводом
 */

class ReflectionGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
    }

    render() {
        const html = `
            <div class="reflection-game active">
                <div class="reflection-question">${this.escapeHtml(this.data.question)}</div>
                <textarea class="reflection-textarea" placeholder="${this.escapeHtml(this.data.prompt)}"></textarea>
                <button class="btn reflection-save">💾 Сохранить размышление</button>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachHandlers();
    }

    attachHandlers() {
        const saveBtn = this.container.querySelector('.reflection-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const textarea = this.container.querySelector('.reflection-textarea');
                this.handleSave(textarea.value);
            });
        }
    }

    handleSave(text) {
        if (text.trim().length > 10) {
            if (this.onComplete) this.onComplete(true);
            alert('💾 Размышление сохранено!');
        } else {
            alert('✍️ Напиши хотя бы пару предложений');
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
    module.exports = ReflectionGame;
}
