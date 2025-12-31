 /**
 * WHEEL OF FORTUNE GAME ENGINE
 * Колесо фортуны (для будущего использования)
 */

class WheelGame {
    constructor(gameData, container, onComplete) {
        this.data = gameData;
        this.container = container;
        this.onComplete = onComplete;
        this.currentRotation = 0;
        this.isSpinning = false;
    }

    render() {
        const html = `
            <div class="wheel-game active">
                <h3 class="wheel-title">${this.escapeHtml(this.data.title || 'Колесо Фортуны')}</h3>
                <div class="wheel-container">
                    <canvas id="wheelCanvas" width="400" height="400"></canvas>
                    <div class="wheel-pointer">▼</div>
                </div>
                <button class="btn wheel-spin">🎯 Крутить колесо!</button>
                <div class="wheel-question" style="display:none;"></div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.drawWheel();
        this.attachHandlers();
    }

    drawWheel() {
        const canvas = document.getElementById('wheelCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 180;
        
        const segments = this.data.questions || [];
        const segmentAngle = (2 * Math.PI) / segments.length;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9'];
        
        segments.forEach((segment, i) => {
            const startAngle = i * segmentAngle + this.currentRotation;
            const endAngle = startAngle + segmentAngle;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`Вопрос ${i + 1}`, radius - 20, 5);
            ctx.restore();
        });
    }

    attachHandlers() {
        const spinBtn = this.container.querySelector('.wheel-spin');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spin());
        }
    }

    spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        
        const segments = this.data.questions || [];
        const spins = 5 + Math.random() * 3;
        const finalRotation = this.currentRotation + (spins * 2 * Math.PI);
        const duration = 3000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeOutCubic(progress);
            
            this.currentRotation = finalRotation * eased;
            this.drawWheel();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                this.showSelectedQuestion();
            }
        };
        
        animate();
    }

    showSelectedQuestion() {
        const segments = this.data.questions || [];
        const segmentAngle = (2 * Math.PI) / segments.length;
        const normalizedRotation = this.currentRotation % (2 * Math.PI);
        const selectedIndex = Math.floor((2 * Math.PI - normalizedRotation) / segmentAngle) % segments.length;
        
        const question = segments[selectedIndex];
        const questionEl = this.container.querySelector('.wheel-question');
        if (questionEl && question) {
            questionEl.style.display = 'block';
            questionEl.innerHTML = `
                <h4>Выпал вопрос ${selectedIndex + 1}:</h4>
                <p>${this.escapeHtml(question.text)}</p>
            `;
        }
        
        if (this.onComplete) this.onComplete(true);
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
