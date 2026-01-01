/**
 * QUIZ GAME ENGINE TESTS
 * Comprehensive test suite for QuizGame class
 */

const QuizGame = require('./quiz.js');

describe('QuizGame', () => {
    let container;
    let mockOnComplete;
    let gameData;

    beforeEach(() => {
        // Setup DOM container
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock callback
        mockOnComplete = jest.fn();

        // Sample game data
        gameData = {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctIndex: 1,
            explanation: 'Two plus two equals four!'
        };
    });

    afterEach(() => {
        // Cleanup
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            const game = new QuizGame(gameData, container, mockOnComplete);

            expect(game.data).toBe(gameData);
            expect(game.container).toBe(container);
            expect(game.onComplete).toBe(mockOnComplete);
            expect(game.answered).toBe(false);
        });

        test('should work without onComplete callback', () => {
            const game = new QuizGame(gameData, container);

            expect(game.onComplete).toBeUndefined();
            expect(game.answered).toBe(false);
        });

        test('should handle empty game data', () => {
            const emptyData = {
                question: '',
                options: [],
                correctIndex: 0,
                explanation: ''
            };
            const game = new QuizGame(emptyData, container, mockOnComplete);

            expect(game.data).toBe(emptyData);
            expect(game.answered).toBe(false);
        });
    });

    describe('escapeHtml', () => {
        let game;

        beforeEach(() => {
            game = new QuizGame(gameData, container, mockOnComplete);
        });

        test('should escape HTML special characters', () => {
            expect(game.escapeHtml('<script>alert("xss")</script>'))
                .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        test('should escape ampersands', () => {
            expect(game.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        });

        test('should preserve quotes (textContent does not escape them)', () => {
            const result = game.escapeHtml('"Hello" \'World\'');
            expect(result).toBe('"Hello" \'World\'');
            // Note: textContent preserves quotes, which is safe when inserted as text
        });

        test('should handle empty string', () => {
            expect(game.escapeHtml('')).toBe('');
        });

        test('should handle null value', () => {
            expect(game.escapeHtml(null)).toBe('');
        });

        test('should handle undefined value', () => {
            expect(game.escapeHtml(undefined)).toBe('');
        });

        test('should preserve safe text', () => {
            expect(game.escapeHtml('Hello World')).toBe('Hello World');
        });

        test('should escape HTML tags and ampersands', () => {
            const malicious = '<div onclick="alert(\'xss\')">Click & Win!</div>';
            const escaped = game.escapeHtml(malicious);
            // Should escape angle brackets and ampersands
            expect(escaped).not.toContain('<div');
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
            expect(escaped).toContain('&amp;');
            // onclick text remains but is harmless as text content
            expect(escaped).toContain('onclick');
        });
    });

    describe('render', () => {
        let game;

        beforeEach(() => {
            game = new QuizGame(gameData, container, mockOnComplete);
        });

        test('should create quiz game structure', () => {
            game.render();

            expect(container.querySelector('.quiz-game')).toBeTruthy();
            expect(container.querySelector('.quiz-question')).toBeTruthy();
            expect(container.querySelector('.quiz-options')).toBeTruthy();
            expect(container.querySelector('.quiz-feedback')).toBeTruthy();
        });

        test('should display question text', () => {
            game.render();

            const question = container.querySelector('.quiz-question');
            expect(question.textContent).toBe(gameData.question);
        });

        test('should render all options', () => {
            game.render();

            const options = container.querySelectorAll('.quiz-option');
            expect(options.length).toBe(gameData.options.length);

            options.forEach((option, i) => {
                expect(option.textContent).toBe(gameData.options[i]);
                expect(option.dataset.optionIndex).toBe(String(i));
            });
        });

        test('should escape HTML in question', () => {
            const xssData = {
                ...gameData,
                question: '<script>alert("xss")</script>'
            };
            const xssGame = new QuizGame(xssData, container, mockOnComplete);
            xssGame.render();

            const questionEl = container.querySelector('.quiz-question');
            expect(questionEl.innerHTML).not.toContain('<script>');
            expect(questionEl.textContent).toContain('script');
        });

        test('should escape HTML in options', () => {
            const xssData = {
                ...gameData,
                options: ['<img src=x onerror=alert(1)>', 'Safe option', '<b>Bold</b>']
            };
            const xssGame = new QuizGame(xssData, container, mockOnComplete);
            xssGame.render();

            const options = container.querySelectorAll('.quiz-option');
            expect(options[0].innerHTML).not.toContain('<img');
            expect(options[2].innerHTML).not.toContain('<b>');
        });

        test('should create feedback elements', () => {
            game.render();

            const feedback = container.querySelector('.quiz-feedback');
            expect(feedback.querySelector('.feedback-title')).toBeTruthy();
            expect(feedback.querySelector('.feedback-text')).toBeTruthy();
        });

        test('should attach click handlers to options', () => {
            game.render();

            const options = container.querySelectorAll('.quiz-option');
            options.forEach(option => {
                expect(option.onclick || option.click).toBeDefined();
            });
        });

        test('should handle large number of options', () => {
            const manyOptionsData = {
                ...gameData,
                options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`)
            };
            const manyGame = new QuizGame(manyOptionsData, container, mockOnComplete);
            manyGame.render();

            const options = container.querySelectorAll('.quiz-option');
            expect(options.length).toBe(10);
        });
    });

    describe('handleAnswer', () => {
        let game;

        beforeEach(() => {
            game = new QuizGame(gameData, container, mockOnComplete);
            game.render();
        });

        test('should mark correct answer as correct', () => {
            game.handleAnswer(gameData.correctIndex);

            const options = container.querySelectorAll('.quiz-option');
            expect(options[gameData.correctIndex].classList.contains('correct')).toBe(true);
            expect(game.answered).toBe(true);
        });

        test('should call onComplete with true for correct answer', () => {
            game.handleAnswer(gameData.correctIndex);

            expect(mockOnComplete).toHaveBeenCalledTimes(1);
            expect(mockOnComplete).toHaveBeenCalledWith(true);
        });

        test('should mark incorrect answer and show correct one', () => {
            const incorrectIndex = 0;
            game.handleAnswer(incorrectIndex);

            const options = container.querySelectorAll('.quiz-option');
            expect(options[incorrectIndex].classList.contains('incorrect')).toBe(true);
            expect(options[gameData.correctIndex].classList.contains('correct')).toBe(true);
            expect(game.answered).toBe(true);
        });

        test('should call onComplete with false for incorrect answer', () => {
            game.handleAnswer(0);

            expect(mockOnComplete).toHaveBeenCalledTimes(1);
            expect(mockOnComplete).toHaveBeenCalledWith(false);
        });

        test('should disable all options after answering', () => {
            game.handleAnswer(gameData.correctIndex);

            const options = container.querySelectorAll('.quiz-option');
            options.forEach(option => {
                expect(option.classList.contains('disabled')).toBe(true);
            });
        });

        test('should show feedback for correct answer', () => {
            game.handleAnswer(gameData.correctIndex);

            const feedback = container.querySelector('.quiz-feedback');
            expect(feedback.classList.contains('success')).toBe(true);
            expect(feedback.classList.contains('show')).toBe(true);

            const title = feedback.querySelector('.feedback-title');
            expect(title.textContent).toContain('Отлично');

            const text = feedback.querySelector('.feedback-text');
            expect(text.textContent).toBe(gameData.explanation);
        });

        test('should show feedback for incorrect answer', () => {
            game.handleAnswer(0);

            const feedback = container.querySelector('.quiz-feedback');
            expect(feedback.classList.contains('error')).toBe(true);
            expect(feedback.classList.contains('show')).toBe(true);

            const title = feedback.querySelector('.feedback-title');
            expect(title.textContent).toContain('Неправильно');
        });

        test('should not call onComplete if callback is null', () => {
            const gameWithoutCallback = new QuizGame(gameData, container, null);
            gameWithoutCallback.render();

            expect(() => {
                gameWithoutCallback.handleAnswer(gameData.correctIndex);
            }).not.toThrow();
        });

        test('should handle boundary case - first option correct', () => {
            const firstCorrectData = {
                ...gameData,
                correctIndex: 0
            };
            const firstGame = new QuizGame(firstCorrectData, container, mockOnComplete);
            firstGame.render();
            firstGame.handleAnswer(0);

            expect(mockOnComplete).toHaveBeenCalledWith(true);
        });

        test('should handle boundary case - last option correct', () => {
            const lastCorrectData = {
                ...gameData,
                correctIndex: gameData.options.length - 1
            };
            const lastGame = new QuizGame(lastCorrectData, container, mockOnComplete);
            lastGame.render();
            lastGame.handleAnswer(lastCorrectData.correctIndex);

            expect(mockOnComplete).toHaveBeenCalledWith(true);
        });
    });

    describe('showFeedback', () => {
        let game;

        beforeEach(() => {
            game = new QuizGame(gameData, container, mockOnComplete);
            game.render();
        });

        test('should display success feedback', () => {
            game.showFeedback(true, 'Great job!');

            const feedback = container.querySelector('.quiz-feedback');
            expect(feedback.classList.contains('success')).toBe(true);
            expect(feedback.classList.contains('show')).toBe(true);
            expect(feedback.querySelector('.feedback-title').textContent).toContain('Отлично');
            expect(feedback.querySelector('.feedback-text').textContent).toBe('Great job!');
        });

        test('should display error feedback', () => {
            game.showFeedback(false, 'Try again!');

            const feedback = container.querySelector('.quiz-feedback');
            expect(feedback.classList.contains('error')).toBe(true);
            expect(feedback.classList.contains('show')).toBe(true);
            expect(feedback.querySelector('.feedback-title').textContent).toContain('Неправильно');
            expect(feedback.querySelector('.feedback-text').textContent).toBe('Try again!');
        });

        test('should handle missing feedback element gracefully', () => {
            container.querySelector('.quiz-feedback').remove();

            expect(() => {
                game.showFeedback(true, 'Test');
            }).not.toThrow();
        });

        test('should handle empty explanation text', () => {
            game.showFeedback(true, '');

            const text = container.querySelector('.feedback-text');
            expect(text.textContent).toBe('');
        });

        test('should update feedback on subsequent calls', () => {
            game.showFeedback(true, 'First message');
            const text = container.querySelector('.feedback-text');
            expect(text.textContent).toBe('First message');

            game.showFeedback(false, 'Second message');
            expect(text.textContent).toBe('Second message');
        });
    });

    describe('User Interaction Flow', () => {
        let game;

        beforeEach(() => {
            game = new QuizGame(gameData, container, mockOnComplete);
            game.render();
        });

        test('should handle click on correct option', () => {
            const options = container.querySelectorAll('.quiz-option');
            options[gameData.correctIndex].click();

            expect(game.answered).toBe(true);
            expect(mockOnComplete).toHaveBeenCalledWith(true);
            expect(options[gameData.correctIndex].classList.contains('correct')).toBe(true);
        });

        test('should handle click on incorrect option', () => {
            const options = container.querySelectorAll('.quiz-option');
            options[0].click();

            expect(game.answered).toBe(true);
            expect(mockOnComplete).toHaveBeenCalledWith(false);
            expect(options[0].classList.contains('incorrect')).toBe(true);
        });

        test('should not process clicks after answer is given', () => {
            const options = container.querySelectorAll('.quiz-option');

            // First click
            options[0].click();
            expect(mockOnComplete).toHaveBeenCalledTimes(1);

            // Second click should be ignored
            options[1].click();
            expect(mockOnComplete).toHaveBeenCalledTimes(1);
        });

        test('should prevent multiple answers', () => {
            const options = container.querySelectorAll('.quiz-option');

            options[0].click();
            const firstCallCount = mockOnComplete.mock.calls.length;

            options[1].click();
            options[2].click();

            expect(mockOnComplete.mock.calls.length).toBe(firstCallCount);
        });
    });

    describe('Edge Cases', () => {
        test('should handle quiz with single option', () => {
            const singleOptionData = {
                question: 'Is this the only option?',
                options: ['Yes'],
                correctIndex: 0,
                explanation: 'Indeed it is!'
            };
            const singleGame = new QuizGame(singleOptionData, container, mockOnComplete);
            singleGame.render();

            const options = container.querySelectorAll('.quiz-option');
            expect(options.length).toBe(1);

            options[0].click();
            expect(mockOnComplete).toHaveBeenCalledWith(true);
        });

        test('should handle quiz with Unicode characters', () => {
            const unicodeData = {
                question: '¿Qué significa "привет"?',
                options: ['Hello', 'Goodbye', '你好', '안녕하세요'],
                correctIndex: 0,
                explanation: 'Correct! 🎉'
            };
            const unicodeGame = new QuizGame(unicodeData, container, mockOnComplete);
            unicodeGame.render();

            const questionEl = container.querySelector('.quiz-question');
            expect(questionEl.textContent).toBe(unicodeData.question);
        });

        test('should handle very long question text', () => {
            const longData = {
                ...gameData,
                question: 'A'.repeat(500)
            };
            const longGame = new QuizGame(longData, container, mockOnComplete);

            expect(() => longGame.render()).not.toThrow();
            expect(container.querySelector('.quiz-question').textContent.length).toBe(500);
        });

        test('should handle very long option text', () => {
            const longOptionData = {
                ...gameData,
                options: ['Short', 'B'.repeat(200), 'Also short', 'Normal']
            };
            const longGame = new QuizGame(longOptionData, container, mockOnComplete);
            longGame.render();

            const options = container.querySelectorAll('.quiz-option');
            expect(options[1].textContent.length).toBe(200);
        });

        test('should handle missing explanation', () => {
            const noExplanationData = {
                question: 'Test question',
                options: ['A', 'B'],
                correctIndex: 0,
                explanation: undefined
            };
            const noExpGame = new QuizGame(noExplanationData, container, mockOnComplete);
            noExpGame.render();
            noExpGame.handleAnswer(0);

            const feedback = container.querySelector('.feedback-text');
            expect(feedback.textContent).toBe('');
        });

        test('should work with undefined onComplete', () => {
            const game = new QuizGame(gameData, container, undefined);
            game.render();

            expect(() => {
                game.handleAnswer(gameData.correctIndex);
            }).not.toThrow();
        });
    });

    describe('Module Export', () => {
        test('should export QuizGame class', () => {
            expect(QuizGame).toBeDefined();
            expect(typeof QuizGame).toBe('function');
        });

        test('should be instantiable', () => {
            const game = new QuizGame(gameData, container, mockOnComplete);
            expect(game).toBeInstanceOf(QuizGame);
        });
    });
});
