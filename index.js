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
    exec(`xprop -id ${windowId}`, (error, stdout) => {
      if (error) {
        console.error('Error getting window icon:', error);
        resolve('default-icon.png');
        return;
      }
      
      // Extract class name which is often more reliable for icon matching
      const classMatch = stdout.match(/WM_CLASS\(string\) = "([^"]+)"/);
      const className = classMatch ? classMatch[1] : 'unknown';
      
      // More comprehensive icon path list
      const iconPaths = [
        `/usr/share/pixmaps/${className}.png`,
        `/usr/share/icons/hicolor/48x48/apps/${className}.png`,
        `/usr/share/icons/hicolor/256x256/apps/${className}.png`,
        `/usr/share/icons/gnome/48x48/apps/${className}.png`
      ];

      // Find first existing icon
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
        console.error('Error listing windows:', error);
        reject(error);
        return;
      }
      
      try {
        const windowPromises = stdout.split('\n')
          .filter(line => line.trim() !== '')
          .map(async line => {
            const parts = line.split(/\s+/);
            
            // Ensure we have enough parts
            if (parts.length < 4) {
              console.warn('Incomplete window info:', line);
              return null;
            }

            const windowId = parts[0];
            const desktop = parts[1];
            const pid = parts[2];
            const name = parts.slice(3).join(' ');
            
            // Busca o ícone para cada janela
            const icon = await getWindowIcon(windowId);
            
            return { windowId, desktop, pid, name, icon };
          });

        const windows = await Promise.all(windowPromises);
        // Filter out any null entries
        resolve(windows.filter(w => w !== null));
      } catch (err) {
        console.error('Error processing windows:', err);
        reject(err);
      }
    });
  });
}

function focusWindow(windowId) {
  exec(`wmctrl -i -a ${windowId}`);
}

app.whenReady().then(createWindow);

ipcMain.handle('get-windows', async () => {
  try {
    return await listOpenWindows();
  } catch (error) {
    console.error('Failed to get windows:', error);
    return [];
  }
});

ipcMain.on('focus-window', (event, windowId) => {
  focusWindow(windowId);
});