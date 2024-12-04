const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { homedir } = require('os');
const { stdout } = require('process');
const { PNG } = require('pngjs');

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

function listOpenWindows() {
  return new Promise((resolve, reject) => {
    exec('wmctrl -lx', (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const windows = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(/\s+/);
          const windowId = parts[0];
          const className = parts[2]; // e.g., "xfce4-terminal.Xfce4-terminal"
          const name = parts.slice(4).join(' '); // Window name
          const iconPath = findIcon(windowId);
          console.log(iconPath);

          return { windowId, className, name, iconPath };
        });

      resolve(windows);
    });
  });
}

function findIcon(windowId) {
  return new Promise((resolve, reject) => {
    exec(`xprop -id ${windowId}`, (error, stdout) => {
      if (error) {
        console.error(`Erro ao executar xprop: ${error.message}`);
        resolve('default.png'); // Retorna um ícone padrão em caso de erro
        return;
      }

      // Procurar pela propriedade _NET_WM_ICON
      const iconLine = stdout.split('\n').find(line => line.includes('_NET_WM_ICON'));
      if (!iconLine) {
        console.warn(`Nenhum ícone encontrado para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      const match = iconLine.match(/_NET_WM_ICON\(CARDINAL\) = (.+)/);
      if (!match || !match[1]) {
        console.warn(`Dados de ícone inválidos para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      const iconData = match[1].split(',').map(value => parseInt(value.trim(), 10));
      if (iconData.length === 0) {
        console.warn(`Nenhum dado de ícone processável para a janela ${windowId}`);
        resolve('default.png');
        return;
      }

      // Converter os dados do ícone para PNG e retornar o caminho ou Base64
      const pngPath = saveIconAsPng(iconData, windowId);
      resolve(pngPath);
    });
  });
}

function saveIconAsPng(iconData, windowId) {
  try {
    const [width, height, ...pixels] = iconData;

    // Criar uma nova imagem PNG
    const png = new PNG({ width, height });

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      const r = (pixel >> 16) & 0xff;
      const g = (pixel >> 8) & 0xff;
      const b = pixel & 0xff;
      const a = (pixel >> 24) & 0xff;

      const idx = i * 4;
      png.data[idx] = r; // Red
      png.data[idx + 1] = g; // Green
      png.data[idx + 2] = b; // Blue
      png.data[idx + 3] = a; // Alpha
    }

    const iconPath = path.join(__dirname, `${windowId}.png`);
    png.pack().pipe(fs.createWriteStream(iconPath));

    console.log(`Ícone salvo em ${iconPath}`);
    return iconPath; // Caminho do PNG
  } catch (error) {
    console.error(`Erro ao salvar o ícone: ${error.message}`);
    return 'default.png'; // Retorna um ícone padrão se falhar
  }
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
