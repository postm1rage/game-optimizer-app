const outputDiv = document.getElementById('output');
const testContainer = document.getElementById('testContainer');
const describeBtn = document.getElementById('describeBtn');
const testBtn = document.getElementById('testBtn');

let questions = null;

// Показать форму описания проблемы
describeBtn.addEventListener('click', () => {
  testContainer.classList.add('hidden');
  outputDiv.classList.remove('hidden');
  outputDiv.innerHTML = `
    <textarea id="problemText" rows="4" placeholder="Опишите вашу игру и проблему..."></textarea>
    <button id="submitProblem">Получить рекомендацию</button>
    <div id="result"></div>
  `;
  document.getElementById('submitProblem').addEventListener('click', async () => {
    const problem = document.getElementById('problemText').value;
    if (!problem.trim()) return;
    document.getElementById('result').innerHTML = 'Анализируем...';
    const method = await window.electronAPI.askLLM(problem);
    document.getElementById('result').innerHTML = `✅ Рекомендуемый метод: <strong>${method}</strong>`;
  });
});

// Загрузить вопросы и показать тест
testBtn.addEventListener('click', async () => {
  outputDiv.classList.add('hidden');
  testContainer.classList.remove('hidden');
  if (!questions) {
    questions = await window.electronAPI.getQuestions();
  }
  renderTest();
});

function renderTest() {
  let html = '<h2>Ответьте на вопросы</h2>';
  questions.forEach((q, idx) => {
    html += `<div class="question"><p>${q.text}</p>`;
    q.options.forEach(opt => {
      html += `<label><input type="radio" name="q${idx}" value="${opt.value}"> ${opt.text}</label><br>`;
    });
    html += `</div>`;
  });
  html += `<button id="submitTest">Узнать результат</button>`;
  testContainer.innerHTML = html;
  document.getElementById('submitTest').addEventListener('click', computeResult);
}

function computeResult() {
  const weights = { графика: 0, память: 0, физика: 0, сеть: 0 };
  questions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
    if (selected) {
      const optValue = selected.value;
      const option = q.options.find(opt => opt.value === optValue);
      if (option && option.weights) {
        for (let [method, weight] of Object.entries(option.weights)) {
          weights[method] += weight;
        }
      }
    }
  });
  // Находим метод с максимальным весом
  let bestMethod = Object.keys(weights).reduce((a, b) => weights[a] > weights[b] ? a : b);
  testContainer.innerHTML = `<div class="result">🎯 Ваш метод: <strong>${bestMethod}</strong></div><button onclick="location.reload()">Назад</button>`;
}