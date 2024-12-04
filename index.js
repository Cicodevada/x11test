const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function createDock() {
  const dock = new BrowserWindow({
    width: 800,
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

function getWindowIcon(pid) {
  try {
    const iconPath = `/proc/${pid}/exe`;
    const resolvedPath = fs.realpathSync(iconPath);
    const desktopFiles = exec(`find /usr/share/applications -name "*.desktop" | xargs grep -l "Exec=${resolvedPath}"`, 
      (error, stdout) => {
        if (!error && stdout.trim()) {
          const desktopFile = stdout.trim();
          const iconLine = exec(`grep "Icon=" "${desktopFile}"`, 
            (iconError, iconStdout) => {
              if (!iconError) {
                return iconStdout.split('=')[1].trim();
              }
              return null;
            }
          );
        }
      }
    );
  } catch (e) {
    return null;
  }
}

function listRunningWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -l -p', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            id: parts[0],
            desktop: parts[1],
            pid: parts[2],
            title: parts.slice(4).join(' '),
            icon: getWindowIcon(parts[2])
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