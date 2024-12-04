const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

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

function getWindowIcon(windowId) {
  return new Promise((resolve, reject) => {
    exec(`xprop -id ${windowId} _NET_WM_ICON`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      
      const iconMatch = stdout.match(/_NET_WM_ICON\s*=\s*(\d+)/);
      if (iconMatch) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

function focusWindow(windowId) {
  exec(`wmctrl -i -a ${windowId}`);
}

app.whenReady().then(createWindow);

ipcMain.handle('get-windows', async () => {
  const windows = await listOpenWindows();
  
  const windowsWithIcons = await Promise.all(windows.map(async (window) => {
    window.hasIcon = await getWindowIcon(window.windowId);
    return window;
  }));
  
  return windowsWithIcons;
});

ipcMain.on('focus-window', (event, windowId) => {
  focusWindow(windowId);
});