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

// Função para pegar o ícone da janela
function getWindowIcon(windowId) {
  return new Promise((resolve, reject) => {
    exec(`xprop -id ${windowId}`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const iconMatch = stdout.match(/_NET_WM_ICON_NAME\(UTF8_STRING\) = "(.*)"/);
      if (iconMatch && iconMatch[1]) {
        resolve(iconMatch[1]);
      } else {
        resolve('default-icon.png'); // Se não encontrar o ícone, retorna um ícone padrão
      }
    });
  });
}

function listRunningWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -l', async (error, stdout) => {
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
            icon: 'default-icon.png' // Default icon initially
          };
          
          // Tenta buscar o ícone da janela usando o xprop
          getWindowIcon(window.id).then(icon => {
            window.icon = icon;
          }).catch(() => {
            window.icon = 'default-icon.png'; // Caso erro, usa o ícone padrão
          });

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
