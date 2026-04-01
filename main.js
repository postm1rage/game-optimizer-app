const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
  // Открыть DevTools для разработки
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

// IPC: запрос к LLM (пока заглушка)
ipcMain.handle('ask-llm', async (event, userProblem) => {
  // Здесь будет запуск llama.cpp
  // Пока имитируем ответ
  return new Promise((resolve) => {
    setTimeout(() => {
      // Псевдо-ответ: выбираем случайный метод из списка
      const methods = ['графика', 'память', 'физика', 'сеть'];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      resolve(randomMethod);
    }, 1000);
  });
});