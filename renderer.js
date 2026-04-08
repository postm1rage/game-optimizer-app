const outputDiv = document.getElementById('output');
const testContainer = document.getElementById('testContainer');
const describeBtn = document.getElementById('describeBtn');
const testBtn = document.getElementById('testBtn');

let questions = null;
let methodsList = null; // Список всех 20 методов

// Загружаем методы при старте
(async function loadMethods() {
    const response = await fetch('data/methods.json');
    methodsList = await response.json();
    console.log('Загружено методов:', methodsList.length);
})();

// Показать форму описания проблемы
describeBtn.addEventListener('click', () => {
    testContainer.classList.add('hidden');
    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
        <h3>📝 Опишите вашу проблему</h3>
        <textarea id="problemText" rows="5" placeholder="Примеры описания:
- У меня падает FPS в городе с кучей зданий
- Лаги в мультиплеере при стрельбе
- Игра долго загружается
- Текстуры подгружаются медленно"></textarea>
        <button id="submitProblem">🔍 Получить рекомендацию</button>
        <div id="result" class="result-area"></div>
    `;
    
    document.getElementById('submitProblem').addEventListener('click', async () => {
        const problem = document.getElementById('problemText').value;
        if (!problem.trim()) {
            alert('Введите описание проблемы');
            return;
        }
        
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '🔄 Анализируем проблему...';
        resultDiv.classList.add('loading');
        
        // Заглушка LLM (пока случайный метод из 20)
        // Позже заменить на реальный вызов через window.electronAPI.askLLM
        setTimeout(() => {
            // Имитация ответа LLM - выбираем случайный метод из списка
            const randomMethod = methodsList[Math.floor(Math.random() * methodsList.length)];
            displayMethodResult(randomMethod, resultDiv);
            resultDiv.classList.remove('loading');
        }, 1500);
        
        /* РЕАЛЬНАЯ LLM (раскомментировать когда будет готова)
        const methodName = await window.electronAPI.askLLM(problem);
        const foundMethod = methodsList.find(m => m.name === methodName);
        if (foundMethod) {
            displayMethodResult(foundMethod, resultDiv);
        } else {
            resultDiv.innerHTML = `❌ Не удалось определить метод. Попробуйте пройти тест.`;
        }
        resultDiv.classList.remove('loading');
        */
    });
});

// Загрузить вопросы и показать тест
testBtn.addEventListener('click', async () => {
    outputDiv.classList.add('hidden');
    testContainer.classList.remove('hidden');
    
    if (!questions) {
        const response = await fetch('data/questions.json');
        questions = await response.json();
    }
    if (!methodsList) {
        const response = await fetch('data/methods.json');
        methodsList = await response.json();
    }
    renderTest();
});

function renderTest() {
    let html = '<h2>📋 Ответьте на 10 вопросов</h2>';
    html += '<div class="questions-container">';
    
    questions.forEach((q, idx) => {
        html += `
            <div class="question-card">
                <p class="question-text"><strong>${idx + 1}. ${q.text}</strong></p>
                <div class="options-group">
        `;
        
        q.options.forEach((opt, optIdx) => {
            html += `
                <label class="option-label">
                    <input type="radio" name="q${idx}" value="${opt.text}" data-weights='${JSON.stringify(opt.weights)}'>
                    <span>${opt.text}</span>
                </label>
            `;
        });
        
        html += `</div></div>`;
    });
    
    html += `<button id="submitTest" class="submit-btn">🎯 Узнать результат</button></div>`;
    testContainer.innerHTML = html;
    
    document.getElementById('submitTest').addEventListener('click', computeResult);
}

function computeResult() {
    // Инициализируем счётчики для всех 20 методов
    const scores = {};
    methodsList.forEach(method => {
        scores[method.name] = 0;
    });
    
    // Проходим по всем вопросам
    let answeredCount = 0;
    questions.forEach((q, idx) => {
        const selected = document.querySelector(`input[name="q${idx}"]:checked`);
        if (selected) {
            answeredCount++;
            const weights = JSON.parse(selected.getAttribute('data-weights'));
            for (const [methodName, weight] of Object.entries(weights)) {
                if (scores[methodName] !== undefined) {
                    scores[methodName] += weight;
                }
            }
        }
    });
    
    if (answeredCount < questions.length) {
        alert(`Ответьте на все вопросы (отвечено: ${answeredCount}/${questions.length})`);
        return;
    }
    
    // Находим метод с максимальным баллом
    let bestMethodName = null;
    let bestScore = -1;
    for (const [methodName, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestMethodName = methodName;
        }
    }
    
    // Находим полную информацию о методе
    const bestMethod = methodsList.find(m => m.name === bestMethodName);
    
    // Показываем результат с красивым оформлением
    showTestResult(bestMethod, scores);
}

function showTestResult(method, allScores) {
    // Сортируем методы по убыванию баллов для топа
    const sorted = Object.entries(allScores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Топ-5
    
    let html = `
        <div class="result-card">
            <h3>🎉 Рекомендуемый метод оптимизации</h3>
            <div class="main-method">
                <span class="method-name">${method.name}</span>
                <span class="method-category">${method.category}</span>
                <p class="method-description">${method.description}</p>
            </div>
            <h4>📊 Топ-5 методов по результатам теста:</h4>
            <div class="top-methods">
    `;
    
    sorted.forEach((item, idx) => {
        const m = methodsList.find(m => m.name === item.name);
        const percentage = Math.round((item.score / sorted[0].score) * 100);
        html += `
            <div class="top-method-item">
                <div class="top-method-rank">${idx + 1}</div>
                <div class="top-method-info">
                    <strong>${item.name}</strong>
                    <span class="top-method-category">${m ? m.category : ''}</span>
                </div>
                <div class="top-method-score">${item.score} баллов (${percentage}%)</div>
            </div>
        `;
    });
    
    html += `
            </div>
            <button id="restartTest" class="restart-btn">🔄 Пройти тест заново</button>
            <button id="backToMenu" class="back-btn">🏠 Вернуться в меню</button>
        </div>
    `;
    
    testContainer.innerHTML = html;
    
    document.getElementById('restartTest').addEventListener('click', () => {
        renderTest();
    });
    
    document.getElementById('backToMenu').addEventListener('click', () => {
        testContainer.classList.add('hidden');
        outputDiv.classList.add('hidden');
        document.querySelector('.buttons').style.display = 'flex';
    });
}

function displayMethodResult(method, resultDiv) {
    resultDiv.innerHTML = `
        <div class="result-card success">
            <h3>✅ Рекомендуемый метод оптимизации</h3>
            <div class="main-method">
                <span class="method-name">${method.name}</span>
                <span class="method-category">${method.category}</span>
                <p class="method-description">${method.description}</p>
            </div>
            <button id="backFromResult" class="back-btn">🏠 Вернуться в меню</button>
        </div>
    `;
    
    document.getElementById('backFromResult')?.addEventListener('click', () => {
        outputDiv.classList.add('hidden');
        document.querySelector('.buttons').style.display = 'flex';
    });
}

// Скрываем кнопки при открытии теста или описания
describeBtn.addEventListener('click', () => {
    document.querySelector('.buttons').style.display = 'none';
});

testBtn.addEventListener('click', () => {
    document.querySelector('.buttons').style.display = 'none';
});