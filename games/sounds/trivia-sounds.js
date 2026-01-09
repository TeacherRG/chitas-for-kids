/**
 * Trivia Sound Manager - Управление звуковыми эффектами для weekly trivia
 * Использует Web Audio API для генерации звуков
 */

'use strict';

class TriviaSoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.masterVolume = 0.3; // Громкость по умолчанию (30%)
        this.initAudioContext();
    }

    /**
     * Инициализирует Audio Context
     */
    initAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (error) {
            console.warn('Web Audio API не поддерживается:', error);
            this.enabled = false;
        }
    }

    /**
     * Возобновляет Audio Context (требуется для некоторых браузеров)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Создает осциллятор с заданными параметрами
     */
    createOscillator(frequency, type = 'sine') {
        if (!this.audioContext || !this.enabled) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        return { oscillator, gainNode };
    }

    /**
     * Воспроизводит звук правильного ответа
     */
    async playCorrectSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        const { oscillator, gainNode } = this.createOscillator(523.25, 'sine'); // C5
        if (!oscillator) return;

        const now = this.audioContext.currentTime;

        gainNode.gain.setValueAtTime(this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);

        // Добавляем второй тон для более приятного звука
        setTimeout(() => {
            const { oscillator: osc2, gainNode: gain2 } = this.createOscillator(659.25, 'sine'); // E5
            if (!osc2) return;

            const now2 = this.audioContext.currentTime;
            gain2.gain.setValueAtTime(this.masterVolume * 0.8, now2);
            gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.3);

            osc2.start(now2);
            osc2.stop(now2 + 0.3);
        }, 100);
    }

    /**
     * Воспроизводит звук неправильного ответа
     */
    async playIncorrectSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        const { oscillator, gainNode } = this.createOscillator(220, 'sawtooth'); // A3
        if (!oscillator) return;

        const now = this.audioContext.currentTime;

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.4);

        oscillator.start(now);
        oscillator.stop(now + 0.4);
    }

    /**
     * Воспроизводит звук тика часов
     */
    async playTickSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        const { oscillator, gainNode } = this.createOscillator(800, 'square');
        if (!oscillator) return;

        const now = this.audioContext.currentTime;

        gainNode.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    /**
     * Воспроизводит звук окончания времени
     */
    async playTimeUpSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        // Быстрая последовательность звуков
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const { oscillator, gainNode } = this.createOscillator(400 - i * 50, 'square');
                if (!oscillator) return;

                const now = this.audioContext.currentTime;

                gainNode.gain.setValueAtTime(this.masterVolume * 0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

                oscillator.start(now);
                oscillator.stop(now + 0.2);
            }, i * 150);
        }
    }

    /**
     * Воспроизводит звук начала игры
     */
    async playStartSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        // Восходящая арпеджио
        const frequencies = [261.63, 329.63, 392.00]; // C4, E4, G4

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const { oscillator, gainNode } = this.createOscillator(freq, 'sine');
                if (!oscillator) return;

                const now = this.audioContext.currentTime;

                gainNode.gain.setValueAtTime(this.masterVolume * 0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

                oscillator.start(now);
                oscillator.stop(now + 0.3);
            }, index * 100);
        });
    }

    /**
     * Воспроизводит звук завершения викторины
     */
    async playCompleteSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        // Победная мелодия
        const melody = [
            { freq: 523.25, duration: 0.2 }, // C5
            { freq: 659.25, duration: 0.2 }, // E5
            { freq: 783.99, duration: 0.2 }, // G5
            { freq: 1046.50, duration: 0.4 }  // C6
        ];

        let delay = 0;
        melody.forEach((note) => {
            setTimeout(() => {
                const { oscillator, gainNode } = this.createOscillator(note.freq, 'sine');
                if (!oscillator) return;

                const now = this.audioContext.currentTime;

                gainNode.gain.setValueAtTime(this.masterVolume * 0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.duration);

                oscillator.start(now);
                oscillator.stop(now + note.duration);
            }, delay);
            delay += note.duration * 1000;
        });
    }

    /**
     * Воспроизводит предупреждение о 10 секундах
     */
    async playWarningSound() {
        if (!this.enabled) return;
        await this.resumeAudioContext();

        const { oscillator, gainNode } = this.createOscillator(600, 'sine');
        if (!oscillator) return;

        const now = this.audioContext.currentTime;

        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    /**
     * Включает/выключает звуки
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Устанавливает громкость (0.0 - 1.0)
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Проверяет, включены ли звуки
     */
    isEnabled() {
        return this.enabled;
    }
}

// Экспорт для использования в weekly-trivia.js
if (typeof window !== 'undefined') {
    window.TriviaSoundManager = TriviaSoundManager;
}
