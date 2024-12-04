const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

function listOpenWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -l', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      
      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const desktop = parts[1];
          const pid = parts[2];
          const name = parts.slice(3).join(' ');
          
          return { windowId, desktop, pid, name };
        });
      
      resolve(windows);
    });
  });
}

function focusWindow(windowId) {
  exec(`wmctrl -i -a ${windowId}`);
}

app.whenReady().then(createWindow);

ipcMain.handle('get-windows', async () => {
  return await listOpenWindows();
});

ipcMain.on('focus-window', (event, windowId) => {
  focusWindow(windowId);
});