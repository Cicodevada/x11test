const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createDock() {
  const dock = new BrowserWindow({
    width: 800,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  dock.loadFile('index.html'); 
  
  // Posicionar no fundo da tela
  dock.setPosition(0, app.getScreen().getPrimaryDisplay().bounds.height - 80);
}

function listRunningWindows() {
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
          const window = {
            id: parts[0],
            desktop: parts[1],
            pid: parts[2],
            title: parts.slice(4).join(' '),
            icon: 'default-icon.png' // Placeholder for the icon
          };
          
          // Optional: You could use 'xprop' or another tool to get window icon (this would require more code).
          return window;
        });
      resolve(windows);
    });
  });
}

ipcMain.handle('get-windows', async () => {
  return await listRunningWindows();
});

ipcMain.on('activate-window', (event, windowId) => {
  exec(`wmctrl -i -a ${windowId}`);
});

app.whenReady().then(createDock);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
