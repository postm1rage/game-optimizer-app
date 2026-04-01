const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getFewShot: () => ipcRenderer.invoke('get-few-shot'),
  getQuestions: () => ipcRenderer.invoke('get-questions'),
  askLLM: (problem) => ipcRenderer.invoke('ask-llm', problem)
});