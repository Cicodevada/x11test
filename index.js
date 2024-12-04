const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { homedir } = require('os');
const { stdout } = require('process');

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
    exec('wmctrl -lx', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const className = parts[2]; // e.g., "xfce4-terminal.Xfce4-terminal"
          const name = parts.slice(4).join(' '); // Window name
          const iconPath = findIcon(windowId);
          console.log(iconPath);

          return { windowId, className, name, iconPath };
        });

      resolve(windows);
    });
  });
}

function findIcon(appName) {

    exec(`xprop -id ${appName}`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
  });

  // Default icon if not found
  return stdout;
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
