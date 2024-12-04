const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs/promises'); // Using promises for fs operations


async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}


async function listOpenWindows() {
  try {
    const { stdout } = await execPromise('wmctrl -lx');
    const windows = stdout.split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const parts = line.split(/\s+/);
        const windowId = parts[0];
        return { windowId, className: await getWindowClassName(windowId), name: parts.slice(4).join(' '),  };
      });
    return windows;
  } catch (error) {
    console.error("Error listing windows:", error);
    return []; // Return empty array on error
  }
}


async function getWindowClassName(windowId) {
    try {
        const { stdout } = await execPromise(`xprop -id ${windowId} WM_CLASS | cut -d '"' -f 2`);
        return stdout.trim();
    } catch (error) {
        console.error(`Error getting window class for ${windowId}:`, error);
        return "Unknown"; // Return "Unknown" if xprop fails
    }
}

async function findIcon(appName) {
  try {
    const { stdout } = await execPromise(`find /usr/share/icons -name "${appName}*.png" -o -name "${appName}*.svg" 2>/dev/null`);
    const iconPath = stdout.trim();
    return iconPath || path.join(__dirname, 'default-icon.png');
  } catch (error) {
    console.error("Error finding icon:", error);
    return path.join(__dirname, 'default-icon.png');
  }
}


async function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
      } else {
        resolve({ stdout, stderr });
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
  // Add iconPath after getting the className
  const windowsWithIcons = await Promise.all(windows.map(async (window) => ({...window, iconPath: await findIcon(window.className.split('.')[0])})));
  return windowsWithIcons;
});


ipcMain.on('focus-window', (event, windowId) => {
  focusWindow(windowId);
});
