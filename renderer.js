const outputDiv = document.getElementById('output');
const testContainer = document.getElementById('testContainer');
const describeBtn = document.getElementById('describeBtn');
const testBtn = document.getElementById('testBtn');
const mainMenu = document.querySelector('.buttons');

let questions = null;
let methodsList = null;

// Загружаем методы при старте
(async function loadMethods() {
    const response = await fetch('data/methods.json');
    methodsList = await response.json();
    console.log('Загружено методов:', methodsList.length);
})();

// Показать страницу описания проблемы (скрываем меню и тест)
describeBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    testContainer.classList.add('hidden');
    outputDiv.classList.remove('hidden');
    
    outputDiv.innerHTML = `
        <div class="page-header">
            <button class="back-to-menu-btn">← Назад</button>
            <h2>📝 Описать проблему</h2>
        </div>
        <textarea id="problemText" rows="5" placeholder="Примеры описания:
- У меня падает FPS в городе с кучей зданий
- Лаги в мультиплеере при стрельбе
- Игра долго загружается
- Текстуры подгружаются медленно"></textarea>
        <button id="submitProblem" class="submit-llm-btn">🔍 Получить рекомендацию</button>
        <div id="result" class="result-area"></div>
    `;
    
    // Обработчик кнопки "Назад"
    document.querySelector('.back-to-menu-btn').addEventListener('click', () => {
        outputDiv.classList.add('hidden');
        mainMenu.style.display = 'flex';
    });
    
    // Обработчик получения рекомендации
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
        setTimeout(() => {
            const randomMethod = methodsList[Math.floor(Math.random() * methodsList.length)];
            displayMethodResult(randomMethod, resultDiv);
            resultDiv.classList.remove('loading');
        }, 1500);
    });
});

// Показать страницу теста
testBtn.addEventListener('click', async () => {
    mainMenu.style.display = 'none';
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
    let html = `
        <div class="page-header">
            <button class="back-to-menu-btn">← Назад</button>
            <h2>📋 Пройти тест</h2>
        </div>
        <div class="questions-container">
    `;
    
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
    
    html += `
        </div>
        <button id="submitTest" class="submit-test-btn">🎯 Узнать результат</button>
    `;
    
    testContainer.innerHTML = html;
    
    // Обработчик кнопки "Назад"
    document.querySelector('.back-to-menu-btn').addEventListener('click', () => {
        testContainer.classList.add('hidden');
        mainMenu.style.display = 'flex';
    });
    
    // Обработчик отправки теста
    document.getElementById('submitTest').addEventListener('click', computeResult);
}

function computeResult() {
    const scores = {};
    methodsList.forEach(method => {
        scores[method.name] = 0;
    });
    
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
    
    let bestMethodName = null;
    let bestScore = -1;
    for (const [methodName, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestMethodName = methodName;
        }
    }
    
    const bestMethod = methodsList.find(m => m.name === bestMethodName);
    showTestResult(bestMethod, scores);
}

function showTestResult(method, allScores) {
    const sorted = Object.entries(allScores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    let html = `
        <div class="page-header">
            <button class="back-to-menu-btn">← Назад</button>
            <h2>📊 Результат теста</h2>
        </div>
        <div class="result-card">
            <div class="main-method">
                <span class="method-name">${method.name}</span>
                <span class="method-category">${method.category}</span>
                <p class="method-description">${method.description}</p>
            </div>
            <h4>📈 Топ-5 методов:</h4>
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
            <button id="restartTest" class="restart-test-btn">🔄 Пройти тест заново</button>
        </div>
    `;
    
    testContainer.innerHTML = html;
    
    document.querySelector('.back-to-menu-btn').addEventListener('click', () => {
        testContainer.classList.add('hidden');
        mainMenu.style.display = 'flex';
    });
    
    document.getElementById('restartTest').addEventListener('click', () => {
        renderTest();
    });
}

function displayMethodResult(method, resultDiv) {
    resultDiv.innerHTML = `
        <div class="result-card">
            <div class="main-method">
                <span class="method-name">${method.name}</span>
                <span class="method-category">${method.category}</span>
                <p class="method-description">${method.description}</p>
            </div>
            <button id="newProblemBtn" class="new-problem-btn">✏️ Описать другую проблему</button>
        </div>
    `;
    
    document.getElementById('newProblemBtn')?.addEventListener('click', () => {
        // Очищаем и показываем форму заново
        const problemText = document.getElementById('problemText');
        if (problemText) problemText.value = '';
        const resultDiv2 = document.getElementById('result');
        if (resultDiv2) resultDiv2.innerHTML = '';
    });
}