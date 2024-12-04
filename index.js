const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const os = require('os');
const ps = require('node-ps');  // Para interagir com os processos do sistema

let tray = null;
let taskbarWindow = null;

function createWindow() {
  taskbarWindow = new BrowserWindow({
    width: 800,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  taskbarWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // Ícone da tray
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
  
  // Listar aplicativos abertos
  setInterval(() => {
    ps.lookup({}, (err, processList) => {
      if (err) return console.log(err);
      taskbarWindow.webContents.send('update-processes', processList);
    });
  }, 1000); // Atualiza a lista a cada 1 segundo
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
