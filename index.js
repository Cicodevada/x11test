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
  return new Promise((resolve) => {
    exec(`xprop -id ${windowId} _NET_WM_ICON`, (error, stdout) => {
      if (!error && stdout.includes('_NET_WM_ICON')) {
        // O ícone existe no próprio aplicativo
        const tempIconPath = path.join(app.getPath('temp'), `window_icon_${windowId}.png`);
        
        // Script para extrair ícone com xseticon
        const extractScript = `
          xseticon -display $DISPLAY -id ${windowId} | convert - ${tempIconPath}
        `;
        
        exec(extractScript, (extractError) => {
          if (!extractError && fs.existsSync(tempIconPath)) {
            resolve(tempIconPath);
          } else {
            resolve(getAlternativeIcon(windowId));
          }
        });
      } else {
        resolve(getAlternativeIcon(windowId));
      }
    });
  });
}

function getAlternativeIcon(windowId) {
  // Tenta recuperar ícone pelo nome da classe
  const iconDirs = [
    '/usr/share/pixmaps',
    '/usr/share/icons/hicolor/48x48/apps',
    '/usr/share/icons/hicolor/256x256/apps',
    '/usr/share/icons/gnome/48x48/apps'
  ];

  try {
    // Recupera classe do aplicativo
    const classOutput = execSync(`xprop -id ${windowId} WM_CLASS`).toString();
    const match = classOutput.match(/"([^"]+)"/);
    
    if (match) {
      const appClass = match[1];
      for (let dir of iconDirs) {
        const possibleIcons = [
          `${dir}/${appClass}.png`,
          `${dir}/${appClass}.svg`,
          `${dir}/${appClass}.xpm`
        ];

        for (let iconPath of possibleIcons) {
          if (fs.existsSync(iconPath)) {
            return iconPath;
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao recuperar ícone alternativo:', err);
  }

  return 'default-icon.png';
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