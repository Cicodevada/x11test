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

function getWindowIcon(windowId) {
  return new Promise((resolve, reject) => {
    // Tenta obter o ícone do aplicativo usando várias estratégias
    exec(`xprop -id ${windowId} _NET_WM_ICON_NAME`, (error, stdout) => {
      if (error) {
        resolve('default-icon.png');
        return;
      }
      
      // Extrai o nome do aplicativo para buscar o ícone
      const appName = stdout.trim().split('=')[1].replace(/"/g, '').toLowerCase();
      
      // Lista de possíveis locais de ícones no Linux
      const iconPaths = [
        `/usr/share/pixmaps/${appName}.png`,
        `/usr/share/icons/hicolor/48x48/apps/${appName}.png`,
        `/usr/share/icons/hicolor/256x256/apps/${appName}.png`,
        `/usr/share/icons/gnome/48x48/apps/${appName}.png`
      ];

      // Encontra o primeiro ícone existente
      for (let iconPath of iconPaths) {
        if (fs.existsSync(iconPath)) {
          resolve(iconPath);
          return;
        }
      }

      resolve('default-icon.png');
    });
  });
}

function listOpenWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -l', async (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      
      const windowPromises = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(async line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const desktop = parts[1];
          const pid = parts[2];
          const name = parts.slice(3).join(' ');
          
          // Busca o ícone para cada janela
          const icon = await getWindowIcon(windowId);
          
          return { windowId, desktop, pid, name, icon };
        });

      const windows = await Promise.all(windowPromises);
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

// index.html permanece o mesmo do exemplo anterior