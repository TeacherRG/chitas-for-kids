/**
 * ХИТАС ДЛЯ ДЕТЕЙ - PRINT MANAGER
 * Управление функциональностью печати
 */

'use strict';

class PrintManager {
    constructor(app) {
        this.app = app;
        this.originalTitle = document.title;
        this.setupPrintListeners();
    }

    /**
     * Настройка слушателей событий печати
     */
    setupPrintListeners() {
        window.addEventListener('beforeprint', () => this.beforePrint());
        window.addEventListener('afterprint', () => this.afterPrint());
    }

    /**
     * Основная функция печати
     * Определяет, что печатать в зависимости от текущего состояния
     */
    print() {
        // Если открыта секция - печатаем её
        if (this.app.currentSection) {
            this.printCurrentSection();
        }
        // Иначе печатаем весь дневной контент
        else {
            this.printDailyContent();
        }
    }

    /**
     * Печать текущей открытой секции
     */
    printCurrentSection() {
        if (!this.app.currentSection) {
            console.warn('No section is currently open');
            return;
        }

        // Устанавливаем заголовок документа для печати
        const section = this.app.currentSection;
        document.title = `${section.title} - ${this.app.contentData.hebrewDate}`;

        // Добавляем специальный класс для печати секции
        document.body.classList.add('printing-section');

        // Запускаем печать
        window.print();
    }

    /**
     * Печать всего контента за день
     */
    printDailyContent() {
        if (!this.app.contentData) {
            console.warn('No content data available');
            return;
        }

        // Устанавливаем заголовок документа для печати
        document.title = `Хитас - ${this.app.contentData.hebrewDate}`;

        // Добавляем специальный класс для печати дневного контента
        document.body.classList.add('printing-daily');

        // Создаем временный контейнер для печати
        this.createPrintView();

        // Запускаем печать
        window.print();
    }

    /**
     * Создание представления для печати дневного контента
     */
    createPrintView() {
        // Удаляем предыдущее представление для печати, если оно существует
        const existingPrintView = document.getElementById('printView');
        if (existingPrintView) {
            existingPrintView.remove();
        }

        // Создаем новый контейнер для печати
        const printView = document.createElement('div');
        printView.id = 'printView';
        printView.className = 'print-only-view';

        // Добавляем заголовок
        let html = `
            <div class="print-header">
                <h1>📖 Хитас для вундеркиндов</h1>
                <h2>${this.app.escapeHtml(this.app.contentData.hebrewDate)}</h2>
                ${this.app.contentData.dedication ?
                    `<p class="dedication">${this.app.escapeHtml(this.app.contentData.dedication)}</p>` :
                    ''}
            </div>
        `;

        // Добавляем Мазаль Тов, если есть
        if (this.app.contentData.mazalTov && this.app.contentData.mazalTov.length > 0) {
            html += '<div class="print-mazel-tov"><h3>🎉 Мазаль Тов!</h3>';
            this.app.contentData.mazalTov.forEach(mt => {
                html += `
                    <div class="mazel-tov-item">
                        <h4>${this.app.escapeHtml(mt.name)}</h4>
                        <p>${this.app.escapeHtml(mt.occasion)}</p>
                        <p><small>${this.app.escapeHtml(mt.location)}</small></p>
                        <p><em>${this.app.escapeHtml(mt.blessing)}</em></p>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Добавляем все секции
        if (this.app.contentData.sections) {
            this.app.contentData.sections.forEach(section => {
                html += `
                    <div class="print-section">
                        <div class="print-section-header" style="border-left-color: ${section.color}">
                            <span class="section-icon">${section.icon}</span>
                            <div>
                                <h3>${this.app.escapeHtml(section.title)}</h3>
                                <p class="section-subtitle">${this.app.escapeHtml(section.subtitle)}</p>
                            </div>
                        </div>
                        <div class="print-section-content">
                `;

                if (section.content.title) {
                    html += `<h4>${this.app.escapeHtml(section.content.title)}</h4>`;
                }

                if (section.content.paragraphs) {
                    section.content.paragraphs.forEach(para => {
                        const classList = ['print-paragraph', para.type].filter(Boolean).join(' ');
                        let content = '';

                        if (para.title) {
                            content += `<strong>${this.app.escapeHtml(para.title)}</strong><br>`;
                        }

                        content += this.app.escapeHtml(para.text);

                        html += `<p class="${classList}">${content}</p>`;
                    });
                }

                html += `
                        </div>
                    </div>
                `;
            });
        }

        // Добавляем футер
        html += `
            <div class="print-footer">
                <p>Распечатано: ${new Date().toLocaleDateString('ru-RU')}</p>
                <p>chitas-for-kids.web.app</p>
            </div>
        `;

        printView.innerHTML = html;
        document.body.appendChild(printView);
    }

    /**
     * Вызывается перед началом печати
     */
    beforePrint() {
        console.log('Preparing for print...');

        // Останавливаем любую озвучку
        if (this.app.speechSynthesis) {
            this.app.speechSynthesis.cancel();
        }

        // Сохраняем текущее состояние прокрутки
        this.scrollPosition = window.scrollY;
    }

    /**
     * Вызывается после окончания печати
     */
    afterPrint() {
        console.log('Cleaning up after print...');

        // Восстанавливаем оригинальный заголовок
        document.title = this.originalTitle;

        // Удаляем классы печати
        document.body.classList.remove('printing-section', 'printing-daily');

        // Удаляем временное представление для печати
        const printView = document.getElementById('printView');
        if (printView) {
            printView.remove();
        }

        // Восстанавливаем позицию прокрутки
        if (this.scrollPosition !== undefined) {
            window.scrollTo(0, this.scrollPosition);
        }
    }

    /**
     * Печать специфического контента (для будущего расширения)
     */
    printCustomContent(title, content) {
        document.title = title;

        const printView = document.createElement('div');
        printView.id = 'printView';
        printView.className = 'print-only-view';
        printView.innerHTML = content;

        document.body.appendChild(printView);
        document.body.classList.add('printing-custom');

        window.print();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintManager;
}
