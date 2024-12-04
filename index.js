const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

let tray = null;
let taskbarWindow = null;

function createWindow() {
  taskbarWindow = new BrowserWindow({
    width: 800,
    height: 60,
    frame: false,  // sem borda, apenas a barra
    x: 0,
    y: os.platform() === 'win32' ? 0 : 1080, // Posição inicial da taskbar (ajuste se necessário)
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,  // Não aparece na taskbar padrão do sistema
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  taskbarWindow.loadFile('index.html');

  // Mostrar a taskbar no topo da tela (modo fixo)
  taskbarWindow.setVisibleOnAllWorkspaces(true);
  taskbarWindow.setPosition(0, 0, false);

  // Quando a janela for fechada, destruir a instância
  taskbarWindow.on('closed', () => {
    taskbarWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Criar um ícone da tray (no sistema)
  tray = new Tray(path.join(__dirname, 'tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Fechar Taskbar', click: () => { app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
