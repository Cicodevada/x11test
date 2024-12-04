const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');

function createDock() {
  const dock = new BrowserWindow({
    width: 1200,
    height: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  dock.loadFile('index.html');
  dock.setPosition(0, app.getScreen().getPrimaryDisplay().bounds.height - 80);
}

function listRunningWindows() {
  return new Promise((resolve, reject) => {
    exec(`
      wmctrl -xl | while read line; do 
        pid=$(echo "$line" | awk '{print $3}')
        exe=$(readlink -f "/proc/$pid/exe")
        icon=$(find /usr/share/pixmaps /usr/share/icons -type f \( -name "*$(basename "$exe")*.png" -o -name "*$(basename "$exe")*.svg" \) | head -n1)
        echo "$line|$icon"
      done
    `, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      
      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [windowInfo, iconPath] = line.split('|');
          const parts = windowInfo.split(/\s+/);
          return {
            id: parts[0],
            class: parts[1],
            pid: parts[2],
            title: parts.slice(4).join(' '),
            icon: iconPath || null
          };
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