 /**
 * MATCH GAME ENGINE
 * Игра "Соедини пары"
 */

class MatchGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
        this.selected = [];
        this.matched = [];
    }

    render() {
        let html = `
            <div class="match-game active">
                <div class="match-instruction">${this.escapeHtml(this.data.instruction)}</div>
                <div class="match-pairs">
        `;

        // Left column with header
        html += '<div class="match-column match-column-left">';
        html += '<div class="match-column-header">Колонка 1</div>';
        html += '<div class="match-items-container">';
        this.data.pairs.forEach((pair, i) => {
            html += `<div class="match-item" data-side="left" data-pair-id="${i}">${this.escapeHtml(pair.left)}</div>`;
        });
        html += '</div></div>';

        // Separator
        html += '<div class="match-separator">⟷</div>';

        // Right column with header (shuffled)
        html += '<div class="match-column match-column-right">';
        html += '<div class="match-column-header">Колонка 2</div>';
        html += '<div class="match-items-container">';
        const shuffled = this.shuffleArray([...this.data.pairs]);
        shuffled.forEach(pair => {
            const originalIndex = this.data.pairs.findIndex(p => p.id === pair.id);
            html += `<div class="match-item" data-side="right" data-pair-id="${originalIndex}">${this.escapeHtml(pair.right)}</div>`;
        });
        html += '</div></div>';

        html += '</div></div>';
        this.container.innerHTML = html;
        this.attachHandlers();
    }

    attachHandlers() {
        this.container.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => this.handleClick(item));
        });
    }

    handleClick(item) {
        if (item.classList.contains('matched') || item.classList.contains('disabled')) return;

        const pairId = parseInt(item.dataset.pairId);
        const side = item.dataset.side;

        // Toggle selection
        if (item.classList.contains('selected')) {
            item.classList.remove('selected');
            this.selected = this.selected.filter(
                s => !(s.side === side && s.pairId === pairId)
            );
        } else {
            item.classList.add('selected');
            this.selected.push({ side, pairId, element: item });
        }

        // Check for match
        if (this.selected.length === 2) {
            const [first, second] = this.selected;
            
            setTimeout(() => {
                if (first.side !== second.side && first.pairId === second.pairId) {
                    // Match!
                    first.element.classList.remove('selected');
                    second.element.classList.remove('selected');
                    first.element.classList.add('matched');
                    second.element.classList.add('matched');
                    this.matched.push(first.pairId);

                    // Конфетти для каждой правильной пары! 🎉
                    if (typeof confetti !== 'undefined') {
                        confetti({
                            particleCount: 50,
                            spread: 60,
                            origin: { y: 0.6 },
                            colors: ['#FFD700', '#667eea', '#38ef7d', '#FF6B9D']
                        });
                    }

                    // Check if all matched
                    if (this.matched.length === this.data.pairs.length) {
                        // Большое празднование при завершении всей игры! 🎊
                        if (typeof confetti !== 'undefined') {
                            setTimeout(() => {
                                confetti({
                                    particleCount: 150,
                                    spread: 100,
                                    origin: { y: 0.5 },
                                    colors: ['#FFD700', '#667eea', '#38ef7d', '#FF6B9D', '#4ECDC4']
                                });
                            }, 300);
                        }
                        if (this.onComplete) this.onComplete(true);
                    }
                } else {
                    // No match
                    first.element.classList.remove('selected');
                    second.element.classList.remove('selected');
                }
                this.selected = [];
            }, 300);
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchGame;
}
