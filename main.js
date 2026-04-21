const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile('index.html');
    // Открыть DevTools при необходимости (раскомментировать)
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC: получить few-shot примеры
ipcMain.handle('get-few-shot', () => {
    const dataPath = path.join(__dirname, 'data', 'few_shot_examples.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(raw);
});

// IPC: получить вопросы теста
ipcMain.handle('get-questions', () => {
    const dataPath = path.join(__dirname, 'data', 'questions.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(raw);
});

// IPC: запрос к OpenRouter LLM
ipcMain.handle('ask-llm', async (event, userProblem) => {
    // Загружаем few-shot примеры
    const fewShotPath = path.join(__dirname, 'data', 'few_shot_examples.json');
    const examples = JSON.parse(fs.readFileSync(fewShotPath, 'utf-8'));
    
    // Полный список методов для справки
    const allMethods = [
        "Инстансинг",
        "Occlusion Culling",
        "LOD (Level of Detail)",
        "Frustum Culling",
        "Оптимизация шейдеров",
        "Текстурные атласы",
        "Снижение качества теней и эффектов",
        "Управление потоками (Threading)",
        "Профилирование",
        "Управление памятью",
        "Снижение настроек графики",
        "Обновление драйверов",
        "ПО для оптимизации (Razer Cortex и др.)",
        "Оптимизация оконных игр Windows 11",
        "Сетевая оптимизация: дельта-сжатие",
        "Сетевая оптимизация: клиент-серверная архитектура",
        "Сетевая оптимизация: прогнозирование",
        "Сжатие данных",
        "Пул объектов (Object Pooling)",
        "Асинхронная загрузка"
    ];
    
    // Формируем промпт с инструкцией на обобщение
    let prompt = `Ты эксперт по оптимизации игр. Твоя задача — выбрать метод оптимизации для описанной проблемы.

ВАЖНО: Даже если проблема не совпадает с примерами, ты должен выбрать наиболее подходящий метод из списка. Используй логику и обобщай.

Список всех методов (выбери один):
${allMethods.map(m => `- ${m}`).join('\n')}

Примеры соответствий (используй как ориентир, но не копируй слепо):
`;

    // Берём первые 15 примеров, чтобы не перегружать контекст
    examples.slice(0, 15).forEach(ex => {
        prompt += `Проблема: "${ex.problem}" → Метод: ${ex.method}\n`;
    });

    prompt += `\nЕсли ни один пример не подходит, выбери метод по логике.
Если совсем не уверен — выбери "Профилирование".

Теперь определи метод для этой проблемы:
Проблема: "${userProblem}"
Метод:`;
    
    console.log('Sending request to OpenRouter...');
    
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: "arcee-ai/trinity-large-preview:free",
                messages: [
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                max_tokens: 50,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        let method = response.data.choices[0].message.content.trim();
        
        // Очищаем ответ
        method = method.replace(/^Метод:\s*/i, '');
        method = method.replace(/^метод:\s*/i, '');
        method = method.replace(/^Ответ:\s*/i, '');
        method = method.replace(/^ответ:\s*/i, '');
        method = method.replace(/^"|"$/g, '');
        method = method.replace(/[.,!;:]$/, '');
        method = method.split('\n')[0];
        
        console.log('LLM response:', method);
        
        // Проверяем, есть ли метод в списке
        let foundMethod = allMethods.find(m => 
            m.toLowerCase() === method.toLowerCase() ||
            method.toLowerCase().includes(m.toLowerCase()) ||
            m.toLowerCase().includes(method.toLowerCase())
        );
        
        if (foundMethod) {
            return foundMethod;
        }
        
        // Если не нашли, но ответ не пустой — возвращаем как есть
        if (method.length > 0 && method.length < 50) {
            return method;
        }
        
        return 'Профилирование';
        
    } catch (error) {
        console.error('OpenRouter error:', error.response?.data || error.message);
        return 'Профилирование';
    }
});